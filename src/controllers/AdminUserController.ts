import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel, type UserRole, type UserStatus } from '@/models/UserModel';
import { isAdmin } from '@/lib/adminAuth';
import {
  getSessionFromRequest,
  hashPassword,
  isValidEmail,
  toSafeUserDTO,
  validatePasswordStrength
} from '@/lib/userAuth';
import { ensureDefaultAdminSeeded } from '@/controllers/AuthController';

async function checkAdminAccess(request: Request): Promise<NextResponse | null> {
  if (isAdmin(request)) return null;
  const userSession = getSessionFromRequest(request);
  if (userSession?.role === 'admin' && await connectToDatabase()) {
    const user = await UserModel.findOne({ userId: userSession.userId }).select('role status sessionVersion').lean();
    if (user?.role === 'admin' && user.status === 'active' && (user.sessionVersion ?? 1) === userSession.sv) return null;
  }
  return NextResponse.json({ success: false, message: 'Cần quyền Quản trị viên (Admin)' }, { status: 401 });
}

export class AdminUserController {
  /**
   * GET /api/admin/users — Danh sách toàn bộ người dùng & thống kê cho Admin Dashboard
   */
  static async listUsers(request: Request) {
    const denied = await checkAdminAccess(request);
    if (denied) return denied;

    try {
      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
      }

      await ensureDefaultAdminSeeded();

      const users = await UserModel.find({}).sort({ createdAt: -1 }).limit(300).lean();
      const safeUsers = users.map(toSafeUserDTO);

      const stats = {
        total: safeUsers.length,
        vipCount: safeUsers.filter((u) => u.role === 'vip').length,
        adminCount: safeUsers.filter((u) => u.role === 'admin').length,
        lockedCount: safeUsers.filter((u) => u.status === 'locked').length,
        googleCount: safeUsers.filter((u) => u.authProvider === 'google').length
      };

      return NextResponse.json({
        success: true,
        data: safeUsers,
        stats
      });
    } catch (error) {
      console.error('Lỗi listUsers:', error);
      return NextResponse.json({ success: false, message: 'Lỗi tải danh sách người dùng' }, { status: 500 });
    }
  }

  /**
   * POST /api/admin/users — Admin tạo mới tài khoản người dùng trực tiếp
   */
  static async createUser(request: Request) {
    const denied = await checkAdminAccess(request);
    if (denied) return denied;

    try {
      const body = await request.json();
      const fullName = String(body.fullName || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      const password = String(body.password || '');
      const role: UserRole = ['user', 'vip', 'admin'].includes(body.role) ? body.role : 'user';
      const status: UserStatus = ['active', 'locked'].includes(body.status) ? body.status : 'active';

      if (fullName.length < 2) {
        return NextResponse.json({ success: false, message: 'Họ tên tối thiểu 2 ký tự' }, { status: 400 });
      }

      if (!isValidEmail(email)) {
        return NextResponse.json({ success: false, message: 'Email không hợp lệ' }, { status: 400 });
      }

      const pwErr = validatePasswordStrength(password);
      if (pwErr) {
        return NextResponse.json({ success: false, message: pwErr }, { status: 400 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
      }

      const exists = await UserModel.findOne({ email }).lean();
      if (exists) {
        return NextResponse.json({ success: false, message: 'Email này đã tồn tại trong hệ thống' }, { status: 409 });
      }

      const { hash, salt } = hashPassword(password);
      const userId = `USR_${crypto.randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`;

      const created = await UserModel.create({
        userId,
        email,
        fullName,
        phone,
        avatar: '/images/hero/chibi_4.jpg',
        bio: 'Thành viên Vũ Trụ Quà Tặng Số TriKun Love 💖',
        passwordHash: hash,
        passwordSalt: salt,
        role,
        status,
        authProvider: 'local',
        emailVerified: true,
        sessionVersion: 1
      });

      return NextResponse.json({
        success: true,
        message: `Đã tạo tài khoản ${fullName} thành công!`,
        data: toSafeUserDTO(created)
      });
    } catch (error) {
      console.error('Lỗi createUser:', error);
      return NextResponse.json({ success: false, message: 'Lỗi tạo người dùng mới' }, { status: 500 });
    }
  }

  /**
   * PATCH /api/admin/users — Admin chỉnh sửa thông tin, phân quyền (user/vip/admin), khóa/mở khóa hoặc đặt lại mật khẩu
   */
  static async updateUser(request: Request) {
    const denied = await checkAdminAccess(request);
    if (denied) return denied;

    try {
      const body = await request.json();
      const userId = String(body.userId || '').trim();
      if (!userId) {
        return NextResponse.json({ success: false, message: 'Thiếu mã userId' }, { status: 400 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
      }

      const user = await UserModel.findOne({ userId });
      if (!user) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy người dùng' }, { status: 404 });
      }

      if (typeof body.fullName === 'string' && body.fullName.trim().length >= 2) {
        user.fullName = body.fullName.trim();
      }

      if (typeof body.phone === 'string') {
        user.phone = body.phone.trim();
      }

      if (['user', 'vip', 'admin'].includes(body.role)) {
        user.role = body.role as UserRole;
      }

      if (['active', 'locked'].includes(body.status)) {
        user.status = body.status as UserStatus;
        if (body.status === 'active') {
          user.failedLoginAttempts = 0;
          user.lockUntil = null;
        } else {
          user.sessionVersion = (user.sessionVersion || 1) + 1;
        }
      }

      if (typeof body.newPassword === 'string' && body.newPassword.trim().length > 0) {
        const pwErr = validatePasswordStrength(body.newPassword.trim());
        if (pwErr) {
          return NextResponse.json({ success: false, message: pwErr }, { status: 400 });
        }
        const { hash, salt } = hashPassword(body.newPassword.trim());
        user.passwordHash = hash;
        user.passwordSalt = salt;
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        user.sessionVersion = (user.sessionVersion || 1) + 1;
      }

      await user.save();

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật tài khoản ${user.fullName} thành công!`,
        data: toSafeUserDTO(user)
      });
    } catch (error) {
      console.error('Lỗi updateUser:', error);
      return NextResponse.json({ success: false, message: 'Lỗi cập nhật người dùng' }, { status: 500 });
    }
  }

  /**
   * DELETE /api/admin/users?id=USR_... — Xóa tài khoản người dùng
   */
  static async deleteUser(request: Request) {
    const denied = await checkAdminAccess(request);
    if (denied) return denied;

    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('id');

      if (!userId) {
        return NextResponse.json({ success: false, message: 'Thiếu mã userId' }, { status: 400 });
      }

      if (userId === 'USR_ADMIN_TRIKUN') {
        return NextResponse.json(
          { success: false, message: 'Không thể xóa tài khoản Super Admin gốc của hệ thống!' },
          { status: 403 }
        );
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
      }

      await UserModel.deleteOne({ userId });

      return NextResponse.json({
        success: true,
        message: 'Đã xóa tài khoản người dùng khỏi hệ thống'
      });
    } catch (error) {
      console.error('Lỗi deleteUser:', error);
      return NextResponse.json({ success: false, message: 'Lỗi xóa người dùng' }, { status: 500 });
    }
  }
}
