import { NextResponse } from 'next/server';
import { adminConfigured, clearAdminSession, createAdminSession, isAdmin, passwordMatches, requireAdmin } from '@/lib/adminAuth';

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: isAdmin(request), configured: adminConfigured() });
}

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ success: false, message: 'Chưa cấu hình mật khẩu quản trị trên máy chủ' }, { status: 503 });
  }
  const { password } = await request.json();
  if (typeof password !== 'string' || !passwordMatches(password)) {
    return NextResponse.json({ success: false, message: 'Mật khẩu không chính xác' }, { status: 401 });
  }
  const response = NextResponse.json({ success: true });
  createAdminSession(response);
  return response;
}

export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const response = NextResponse.json({ success: true });
  clearAdminSession(response);
  return response;
}
