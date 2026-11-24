import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/UserModel';
import { GiftModel } from '@/models/GiftModel';
import { OrderModel } from '@/models/OrderModel';
import {
  getSessionFromRequest,
  hashPassword,
  setUserSessionCookie,
  toSafeUserDTO,
  validatePasswordStrength,
  verifyPassword
} from '@/lib/userAuth';

export class UserController {
  /**
   * GET /api/user/profile — Lấy hồ sơ cá nhân kèm danh sách quà tặng và đơn hàng của user
   */
  static async getProfile(request: Request) {
    try {
      const session = getSessionFromRequest(request);
      if (!session) {
        return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập' }, { status: 401 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
      }

      const user = await UserModel.findOne({ userId: session.userId }).lean();
      if (!user || user.status === 'locked' || (user.sessionVersion ?? 1) !== session.sv) {
        return NextResponse.json({ success: false, message: 'Tài khoản không khả dụng' }, { status: 403 });
      }

      const [myOrders, myGifts] = await Promise.all([
        OrderModel.find({ ownerUserId: user.userId }).sort({ createdAt: -1 }).limit(30).lean(),
        GiftModel.find({ ownerUserId: user.userId })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean()
      ]);

      return NextResponse.json({
        success: true,
        user: toSafeUserDTO(user),
        orders: myOrders,
        gifts: myGifts
      });
    } catch (error) {
      console.error('Lỗi getProfile:', error);
      return NextResponse.json({ success: false, message: 'Lỗi tải hồ sơ cá nhân' }, { status: 500 });
    }
  }

  /**
   * PATCH /api/user/profile — Cập nhật thông tin hồ sơ cá nhân (Họ tên, SĐT, Avatar, Bio)
   */
  static async updateProfile(request: Request) {
    try {
      const session = getSessionFromRequest(request);
      if (!session) {
        return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập' }, { status: 401 });
      }

      const body = await request.json();
      const fullName = String(body.fullName || '').trim();
      const phone = String(body.phone || '').trim();
      const avatar = String(body.avatar || '').trim();
      const bio = String(body.bio || '').trim();

      if (fullName.length < 2 || fullName.length > 80) {
        return NextResponse.json(
          { success: false, message: 'Họ và tên phải từ 2 đến 80 ký tự' },
          { status: 400 }
        );
      }

      if (phone && !/^[0-9+()\-\s]{8,16}$/.test(phone)) {
        return NextResponse.json(
          { success: false, message: 'Số điện thoại không hợp lệ' },
          { status: 400 }
        );
      }

      if (bio.length > 300) {
        return NextResponse.json(
          { success: false, message: 'Giới thiệu bản thân tối đa 300 ký tự' },
          { status: 400 }
        );
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
      }

      const updated = await UserModel.findOneAndUpdate(
        { userId: session.userId, sessionVersion: session.sv, status: 'active' },
        {
          $set: {
            fullName,
            phone,
            ...(avatar ? { avatar } : {}),
            bio
          }
        },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Đã lưu thông tin hồ sơ cá nhân thành công!',
        user: toSafeUserDTO(updated)
      });
    } catch (error) {
      console.error('Lỗi updateProfile:', error);
      return NextResponse.json({ success: false, message: 'Lỗi cập nhật hồ sơ' }, { status: 500 });
    }
  }

  /**
   * PATCH /api/user/password — Đổi mật khẩu trong trang Hồ sơ cá nhân
   */
  static async changePassword(request: Request) {
    try {
      const session = getSessionFromRequest(request);
      if (!session) {
        return NextResponse.json({ success: false, message: 'Vui lòng đăng nhập' }, { status: 401 });
      }

      const body = await request.json();
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');

      const pwError = validatePasswordStrength(newPassword);
      if (pwError) {
        return NextResponse.json({ success: false, message: pwError }, { status: 400 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
      }

      const user = await UserModel.findOne({ userId: session.userId });
      if (!user || user.status !== 'active' || (user.sessionVersion ?? 1) !== session.sv) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy tài khoản' }, { status: 404 });
      }

      // Nếu user đã có mật khẩu trước đó thì bắt buộc kiểm tra mật khẩu hiện tại
      if (user.passwordHash && user.passwordSalt) {
        if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash, user.passwordSalt)) {
          return NextResponse.json(
            { success: false, message: 'Mật khẩu hiện tại không chính xác' },
            { status: 400 }
          );
        }
      }

      const { hash, salt } = hashPassword(newPassword);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      user.sessionVersion = (user.sessionVersion || 1) + 1;
      await user.save();

      const response = NextResponse.json({
        success: true,
        message: 'Đã cập nhật mật khẩu bảo mật mới thành công!',
        user: toSafeUserDTO(user)
      });

      setUserSessionCookie(response, {
        userId: user.userId,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion
      });

      return response;
    } catch (error) {
      console.error('Lỗi changePassword:', error);
      return NextResponse.json({ success: false, message: 'Lỗi đổi mật khẩu' }, { status: 500 });
    }
  }
}
