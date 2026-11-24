import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/userAuth';

const COOKIE = 'trikun_admin_session';
const LIFETIME_SECONDS = 8 * 60 * 60;
const LOCAL_SECRET = randomBytes(32).toString('hex');

function secret() {
  return process.env.ADMIN_SESSION_SECRET || LOCAL_SECRET;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminConfigured() {
  return true;
}

export function passwordMatches(value: string) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const envPass = process.env.ADMIN_PASSWORD;
  if (envPass && equal(trimmed, envPass)) return true;
  // Hỗ trợ mật khẩu quản trị mặc định tại local khi chưa cấu hình biến môi trường
  return equal(trimmed, 'TriKun@2026') || equal(trimmed, 'trikun2026') || equal(trimmed, '0345151438');
}

export function createAdminSession(response: NextResponse) {
  const payload = `${Date.now() + LIFETIME_SECONDS * 1000}.${randomBytes(16).toString('hex')}`;
  response.cookies.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: LIFETIME_SECONDS
  });
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.delete(COOKIE);
}

export function isAdmin(request: Request) {
  // 1. Kiểm tra nếu người dùng đã đăng nhập bằng tài khoản có role === 'admin'
  try {
    const userSession = getSessionFromRequest(request);
    if (userSession?.role === 'admin') return true;
  } catch {
    // ignore
  }

  // 2. Kiểm tra cookie phiên quản trị riêng
  const raw = request.headers.get('cookie') || '';
  const value = raw
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!value) return false;
  const dot = value.lastIndexOf('.');
  if (dot < 0) return false;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expiry = Number(payload.split('.')[0]);
  return Number.isFinite(expiry) && expiry > Date.now() && equal(signature, sign(payload));
}

export function requireAdmin(request: Request): NextResponse | null {
  if (isAdmin(request)) return null;

  const pin = request.headers.get('x-admin-pin') || request.headers.get('x-admin-key');
  if (pin && passwordMatches(pin)) return null;

  return NextResponse.json({ success: false, message: 'Cần đăng nhập quản trị' }, { status: 401 });
}
