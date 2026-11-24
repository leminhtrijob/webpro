import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { UserRole, UserStatus, AuthProvider } from '@/models/UserModel';

const USER_COOKIE = 'trikun_user_session';
const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60; // 7 ngày
const LOCAL_SESSION_SECRET = randomBytes(32).toString('hex');

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  sv: number; // sessionVersion để thu hồi phiên khi đổi mật khẩu hoặc bị khóa
  exp: number;
}

export interface SafeUserDTO {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  avatar: string;
  bio: string;
  role: UserRole;
  status: UserStatus;
  authProvider: AuthProvider;
  emailVerified: boolean;
  hasPassword: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

function getSecret(): string {
  return (
    process.env.USER_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    LOCAL_SESSION_SECRET
  );
}

function signData(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

function safeCompare(aStr: string, bStr: string): boolean {
  const a = Buffer.from(aStr);
  const b = Buffer.from(bStr);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Mã hóa mật khẩu chuẩn OWASP bằng scrypt + 32-byte salt ngẫu nhiên
 */
export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || randomBytes(32).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return { hash: derived, salt };
}

/**
 * Kiểm tra mật khẩu chống Timing Attack
 */
export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  if (!storedHash || !storedSalt) return false;
  const { hash } = hashPassword(password, storedSalt);
  return safeCompare(hash, storedHash);
}

/**
 * Sinh mã OTP 6 chữ số ngẫu nhiên an toàn mật mã học
 */
export function generateOtpCode(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * Băm mã OTP bằng HMAC-SHA256 kèm salt để không lưu OTP thô trong DB
 */
export function hashOtpCode(otp: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || randomBytes(16).toString('hex');
  const hash = createHmac('sha256', `${getSecret()}:${salt}`).update(otp.trim()).digest('hex');
  return { hash, salt };
}

export function verifyOtpCode(otp: string, storedHash: string, storedSalt: string): boolean {
  if (!otp || !storedHash || !storedSalt) return false;
  const { hash } = hashOtpCode(otp, storedSalt);
  return safeCompare(hash, storedHash);
}

/**
 * Tạo và ký Session Token (định dạng base64url(payload).signature)
 */
export function createSessionToken(user: {
  userId: string;
  email: string;
  role: UserRole;
  sessionVersion?: number;
}): string {
  const payload: SessionPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    sv: user.sessionVersion ?? 1,
    exp: Date.now() + SESSION_LIFETIME_SECONDS * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signData(encoded);
  return `${encoded}.${signature}`;
}

export function setUserSessionCookie(
  response: NextResponse,
  user: { userId: string; email: string; role: UserRole; sessionVersion?: number }
): void {
  const token = createSessionToken(user);
  response.cookies.set(USER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_LIFETIME_SECONDS
  });
}

export function clearUserSessionCookie(response: NextResponse): void {
  response.cookies.delete(USER_COOKIE);
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const rawCookie = request.headers.get('cookie') || '';
  const token = rawCookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${USER_COOKIE}=`))
    ?.slice(USER_COOKIE.length + 1);

  if (!token) return null;
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx < 0) return null;

  const encoded = token.slice(0, dotIdx);
  const signature = token.slice(dotIdx + 1);

  if (!safeCompare(signature, signData(encoded))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload || typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Chuyển đổi User Document sang DTO an toàn (loại bỏ hoàn toàn passwordHash / passwordSalt)
 */
export function toSafeUserDTO(doc: any): SafeUserDTO {
  return {
    userId: String(doc.userId || ''),
    email: String(doc.email || ''),
    fullName: String(doc.fullName || 'Thành viên TriKun'),
    phone: String(doc.phone || ''),
    avatar: String(doc.avatar || '/images/hero/chibi_1.jpg'),
    bio: String(doc.bio || 'Thành viên Vũ Trụ Quà Tặng Số TriKun Love 💖'),
    role: (doc.role as UserRole) || 'user',
    status: (doc.status as UserStatus) || 'active',
    authProvider: (doc.authProvider as AuthProvider) || 'local',
    emailVerified: doc.emailVerified !== false,
    hasPassword: Boolean(doc.passwordHash),
    lastLoginAt: doc.lastLoginAt ? new Date(doc.lastLoginAt).toISOString() : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined
  };
}

/**
 * Kiểm tra định dạng Email và độ mạnh mật khẩu
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed) && trimmed.length <= 120;
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== 'string' || password.length < 6) {
    return 'Mật khẩu phải có ít nhất 6 ký tự';
  }
  if (password.length > 100) {
    return 'Mật khẩu quá dài (tối đa 100 ký tự)';
  }
  return null;
}
