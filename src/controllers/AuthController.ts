import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/UserModel';
import { OtpModel } from '@/models/OtpModel';
import { createAdminSession } from '@/lib/adminAuth';
import {
  clearUserSessionCookie,
  generateOtpCode,
  getSessionFromRequest,
  hashOtpCode,
  hashPassword,
  isValidEmail,
  setUserSessionCookie,
  toSafeUserDTO,
  validatePasswordStrength,
  verifyOtpCode,
  verifyPassword
} from '@/lib/userAuth';
import { sendOtpEmail } from '@/lib/mailer';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // Khóa 15 phút nếu sai mật khẩu 5 lần liên tiếp
const OTP_EXPIRY_MS = 5 * 60 * 1000; // OTP có hiệu lực 5 phút
const OTP_RESEND_COOLDOWN_MS = 20 * 1000; // Chờ 20 giây giữa các lần gửi lại mã
const emailDeliveryConfigured = () => process.env.NODE_ENV !== 'production' || Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/**
 * Đảm bảo tài khoản Super Admin mặc định của chủ hệ thống luôn tồn tại
 */
export async function ensureDefaultAdminSeeded(): Promise<void> {
  try {
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) return;
    const adminEmail = 'leminhtri@trikun.vn';
    const existing = await UserModel.findOne({ email: adminEmail }).lean();
    if (!existing) {
      const { hash, salt } = hashPassword(process.env.ADMIN_PASSWORD);
      await UserModel.create({
        userId: 'USR_ADMIN_TRIKUN',
        email: adminEmail,
        fullName: 'Lê Minh Trí (Founder TriKun)',
        phone: '0345151438',
        avatar: '/images/hero/chibi_1.jpg',
        bio: 'Founder & Super Admin tại Vũ Trụ Quà Tặng Số TriKun Love Studio 💖',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'admin',
        status: 'active',
        authProvider: 'local',
        emailVerified: true
      });
    }
  } catch {
    // Bỏ qua lỗi trùng lặp khi chạy song song
  }
}

export class AuthController {
  /**
   * GET /api/auth/session — Kiểm tra phiên đăng nhập hiện tại
   */
  static async getSession(request: Request) {
    try {
      const session = getSessionFromRequest(request);
      if (!session) {
        return NextResponse.json({ authenticated: false, user: null });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ authenticated: false, user: null });
      }

      const userDoc = await UserModel.findOne({ userId: session.userId }).lean();
      if (!userDoc || userDoc.status === 'locked' || (userDoc.sessionVersion ?? 1) !== session.sv) {
        const res = NextResponse.json({ authenticated: false, user: null });
        clearUserSessionCookie(res);
        return res;
      }

      return NextResponse.json({
        authenticated: true,
        user: toSafeUserDTO(userDoc)
      });
    } catch {
      return NextResponse.json({ authenticated: false, user: null });
    }
  }

  /**
   * DELETE /api/auth/session — Đăng xuất tài khoản
   */
  static async logout() {
    const response = NextResponse.json({
      success: true,
      message: 'Đã đăng xuất tài khoản thành công'
    });
    clearUserSessionCookie(response);
    return response;
  }

  /**
   * POST /api/auth/register/send-otp — Bước 1 Đăng ký: Kiểm tra thông tin & Gửi OTP về Email
   */
  static async sendRegisterOtp(request: Request) {
    try {
      const body = await request.json();
      const fullName = String(body.fullName || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const phone = String(body.phone || '').trim();
      const password = String(body.password || '');

      if (fullName.length < 2 || fullName.length > 80) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập họ và tên hợp lệ (2 - 80 ký tự)' },
          { status: 400 }
        );
      }

      if (!isValidEmail(email)) {
        return NextResponse.json(
          { success: false, message: 'Địa chỉ Email không hợp lệ' },
          { status: 400 }
        );
      }

      if (phone && !/^[0-9+()\-\s]{8,16}$/.test(phone)) {
        return NextResponse.json(
          { success: false, message: 'Số điện thoại không hợp lệ' },
          { status: 400 }
        );
      }

      const pwError = validatePasswordStrength(password);
      if (pwError) {
        return NextResponse.json({ success: false, message: pwError }, { status: 400 });
      }
      if (!emailDeliveryConfigured()) {
        return NextResponse.json({ success: false, message: 'Chức năng gửi mã xác nhận chưa sẵn sàng. Vui lòng thử lại sau.' }, { status: 503 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json(
          { success: false, message: 'Không thể kết nối cơ sở dữ liệu' },
          { status: 503 }
        );
      }

      await ensureDefaultAdminSeeded();

      const existingUser = await UserModel.findOne({ email }).lean();
      if (existingUser) {
        return NextResponse.json(
          { success: false, message: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng tính năng Quên mật khẩu!' },
          { status: 409 }
        );
      }

      // Kiểm tra cooldown chống spam gửi OTP liên tục
      const existingOtp = await OtpModel.findOne({ email, purpose: 'register' }).lean();
      if (
        existingOtp &&
        existingOtp.lastSentAt &&
        Date.now() - new Date(existingOtp.lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
      ) {
        const waitSec = Math.ceil(
          (OTP_RESEND_COOLDOWN_MS - (Date.now() - new Date(existingOtp.lastSentAt).getTime())) / 1000
        );
        return NextResponse.json(
          { success: false, message: `Vui lòng chờ ${waitSec} giây trước khi yêu cầu gửi lại mã OTP` },
          { status: 429 }
        );
      }

      const otpCode = generateOtpCode();
      const { hash: otpHash, salt: otpSalt } = hashOtpCode(otpCode);
      const { hash: passwordHash, salt: passwordSalt } = hashPassword(password);

      await OtpModel.findOneAndUpdate(
        { email, purpose: 'register' },
        {
          email,
          purpose: 'register',
          otpHash,
          otpSalt,
          attempts: 0,
          maxAttempts: 5,
          pendingData: {
            fullName,
            phone,
            passwordHash,
            passwordSalt
          },
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
          lastSentAt: new Date()
        },
        { upsert: true, new: true }
      );

      const mailRes = await sendOtpEmail({
        email,
        otpCode,
        purpose: 'register',
        fullName
      });

      return NextResponse.json({
        success: true,
        message: `Đã gửi mã xác thực OTP 6 chữ số tới email ${email}`,
        email,
        expiresInSeconds: 300,
        devOtpPreview: mailRes.devOtpPreview
      });
    } catch (error) {
      console.error('Lỗi sendRegisterOtp:', error);
      return NextResponse.json(
        { success: false, message: 'Chưa thể gửi mã xác nhận. Vui lòng thử lại sau.' },
        { status: 503 }
      );
    }
  }

  /**
   * POST /api/auth/register/verify-otp — Bước 2 Đăng ký: Xác thực OTP & Khởi tạo tài khoản
   */
  static async verifyRegisterOtp(request: Request) {
    try {
      const body = await request.json();
      const email = String(body.email || '').trim().toLowerCase();
      const otp = String(body.otp || '').trim();

      if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số' },
          { status: 400 }
        );
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json(
          { success: false, message: 'Không thể kết nối cơ sở dữ liệu' },
          { status: 503 }
        );
      }

      const otpDoc = await OtpModel.findOne({ email, purpose: 'register' });
      if (!otpDoc || new Date(otpDoc.expiresAt).getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, message: 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu gửi mã mới!' },
          { status: 400 }
        );
      }

      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        await OtpModel.deleteOne({ _id: otpDoc._id });
        return NextResponse.json(
          { success: false, message: 'Bạn đã nhập sai OTP quá 5 lần. Vui lòng bấm gửi lại mã OTP mới!' },
          { status: 429 }
        );
      }

      const isValid = verifyOtpCode(otp, otpDoc.otpHash, otpDoc.otpSalt);
      if (!isValid) {
        otpDoc.attempts += 1;
        await otpDoc.save();
        const remaining = Math.max(0, otpDoc.maxAttempts - otpDoc.attempts);
        return NextResponse.json(
          {
            success: false,
            message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
          },
          { status: 400 }
        );
      }

      // Kiểm tra lại email phòng trường hợp đăng ký trùng
      const existingUser = await UserModel.findOne({ email }).lean();
      if (existingUser) {
        await OtpModel.deleteOne({ _id: otpDoc._id });
        return NextResponse.json(
          { success: false, message: 'Tài khoản với email này đã được kích hoạt trước đó!' },
          { status: 409 }
        );
      }

      const userId = `USR_${crypto.randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
      const avatars = [
        '/images/hero/chibi_1.jpg',
        '/images/hero/chibi_2.jpg',
        '/images/hero/chibi_3.jpg',
        '/images/hero/chibi_4.jpg',
        '/images/hero/chibi_5.jpg',
        '/images/hero/chibi_6.jpg'
      ];
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

      const newUser = await UserModel.create({
        userId,
        email,
        fullName: otpDoc.pendingData?.fullName || 'Thành viên TriKun',
        phone: otpDoc.pendingData?.phone || '',
        avatar: randomAvatar,
        bio: 'Thành viên Vũ Trụ Quà Tặng Số TriKun Love 💖',
        passwordHash: otpDoc.pendingData?.passwordHash || '',
        passwordSalt: otpDoc.pendingData?.passwordSalt || '',
        role: 'user',
        status: 'active',
        authProvider: 'local',
        emailVerified: true,
        sessionVersion: 1,
        lastLoginAt: new Date()
      });

      await OtpModel.deleteOne({ _id: otpDoc._id });

      const safeUser = toSafeUserDTO(newUser);
      const response = NextResponse.json({
        success: true,
        message: 'Xác thực OTP & Tạo tài khoản thành công! Chào mừng bạn đến với TriKun Love Studio 💖',
        user: safeUser
      });

      setUserSessionCookie(response, {
        userId: newUser.userId,
        email: newUser.email,
        role: newUser.role,
        sessionVersion: newUser.sessionVersion
      });

      return response;
    } catch (error) {
      console.error('Lỗi verifyRegisterOtp:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi máy chủ khi xác thực mã OTP' },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/auth/login — Đăng nhập bằng Email / Số điện thoại + Mật khẩu
   */
  static async login(request: Request) {
    try {
      const body = await request.json();
      const identifier = String(body.identifier || body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!identifier || !password) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập Email / SĐT và mật khẩu' },
          { status: 400 }
        );
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json(
          { success: false, message: 'Không thể kết nối cơ sở dữ liệu' },
          { status: 503 }
        );
      }

      await ensureDefaultAdminSeeded();

      const user = await UserModel.findOne({
        $or: [{ email: identifier }, { phone: identifier }]
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' },
          { status: 401 }
        );
      }

      if (user.status === 'locked') {
        return NextResponse.json(
          {
            success: false,
            message: 'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ Zalo 0345151438.'
          },
          { status: 403 }
        );
      }

      if (user.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
        const waitMinutes = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
        return NextResponse.json(
          {
            success: false,
            message: `Tài khoản tạm khóa bảo mật do nhập sai nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút hoặc dùng Quên mật khẩu.`
          },
          { status: 429 }
        );
      }

      if (!user.passwordHash || !user.passwordSalt) {
        return NextResponse.json(
          {
            success: false,
            message: 'Tài khoản này được tạo bằng Google. Vui lòng bấm "Đăng nhập nhanh với Google" hoặc dùng "Quên mật khẩu" để tạo mật khẩu riêng.'
          },
          { status: 400 }
        );
      }

      const isMatch = verifyPassword(password, user.passwordHash, user.passwordSalt);
      if (user.role === 'admin' && (password === '0345151438' || password === 'trikun2026')) {
        return NextResponse.json({ success: false, message: 'Mật khẩu quản trị này không còn được sử dụng. Vui lòng đặt mật khẩu mới.' }, { status: 401 });
      }
      if (!isMatch) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
          await user.save();
          return NextResponse.json(
            {
              success: false,
              message: 'Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Tài khoản tạm khóa 15 phút để bảo vệ an toàn!'
            },
            { status: 429 }
          );
        }
        await user.save();
        const remaining = MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts;
        return NextResponse.json(
          {
            success: false,
            message: `Mật khẩu không chính xác (còn ${remaining} lần thử trước khi tạm khóa bảo mật)`
          },
          { status: 401 }
        );
      }

      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      user.lastLoginAt = new Date();
      await user.save();

      const safeUser = toSafeUserDTO(user);
      const response = NextResponse.json({
        success: true,
        message: `Chào mừng ${user.fullName} quay trở lại!`,
        user: safeUser
      });

      setUserSessionCookie(response, {
        userId: user.userId,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion
      });

      if (user.role === 'admin') {
        createAdminSession(response);
      }

      return response;
    } catch (error) {
      console.error('Lỗi login:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi máy chủ khi đăng nhập' },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/auth/google — Đăng nhập nhanh bằng Google (Hỗ trợ cả Google ID Token JWT & Quick Google OAuth)
   */
  static async googleLogin(request: Request) {
    try {
      const body = await request.json();
      const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        return NextResponse.json({ success: false, message: 'Đăng nhập Google chưa được cấu hình' }, { status: 503 });
      }
      let email = '';
      let fullName = '';
      let avatar = '';
      let googleId = '';

      // Nếu gửi kèm Google ID Token (credential) từ Google Identity Services
      if (typeof body.credential === 'string' && body.credential.includes('.')) {
        try {
          const tokenRes = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`
          );
          if (tokenRes.ok) {
            const info = await tokenRes.json();
            if (info.aud !== googleClientId || String(info.email_verified) !== 'true' || !info.sub) {
              return NextResponse.json({ success: false, message: 'Không thể xác nhận tài khoản Google' }, { status: 401 });
            }
            email = String(info.email || '').trim().toLowerCase();
            fullName = String(info.name || info.given_name || 'Thành viên Google').trim();
            avatar = String(info.picture || '/images/hero/chibi_2.jpg');
            googleId = String(info.sub || '');
          }
        } catch (err) {
          console.warn('Lỗi xác thực Google ID Token:', err);
        }
      }

      if (!isValidEmail(email)) {
        return NextResponse.json(
          { success: false, message: 'Cần đăng nhập bằng tài khoản Google đã xác thực' },
          { status: 401 }
        );
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json(
          { success: false, message: 'Không thể kết nối cơ sở dữ liệu' },
          { status: 503 }
        );
      }

      await ensureDefaultAdminSeeded();

      let user = await UserModel.findOne({ email });
      if (user) {
        if (user.status === 'locked') {
          return NextResponse.json(
            {
              success: false,
              message: 'Tài khoản này đã bị khóa bởi Quản trị viên.'
            },
            { status: 403 }
          );
        }
        if (googleId && !user.googleId) {
          user.googleId = googleId;
        }
        user.emailVerified = true;
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        user.lastLoginAt = new Date();
        await user.save();
      } else {
        const userId = `USR_${crypto.randomUUID().replace(/-/g, '').slice(0, 14).toUpperCase()}`;
        user = await UserModel.create({
          userId,
          email,
          fullName: fullName || 'Thành viên Google',
          phone: '',
          avatar: avatar || '/images/hero/chibi_3.jpg',
          bio: 'Thành viên đăng nhập qua Google tại TriKun Love Studio 💖',
          passwordHash: '',
          passwordSalt: '',
          role: 'user',
          status: 'active',
          authProvider: 'google',
          googleId,
          emailVerified: true,
          sessionVersion: 1,
          lastLoginAt: new Date()
        });
      }

      const safeUser = toSafeUserDTO(user);
      const response = NextResponse.json({
        success: true,
        message: `Đăng nhập Google thành công! Xin chào ${user.fullName} 💖`,
        user: safeUser
      });

      setUserSessionCookie(response, {
        userId: user.userId,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion
      });

      if (user.role === 'admin') {
        createAdminSession(response);
      }

      return response;
    } catch (error) {
      console.error('Lỗi googleLogin:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi máy chủ khi đăng nhập bằng Google' },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/auth/forgot-password/send-otp — Bước 1 Quên mật khẩu: Gửi mã OTP khôi phục về Email
   */
  static async sendForgotPasswordOtp(request: Request) {
    try {
      const body = await request.json();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidEmail(email)) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập địa chỉ Email hợp lệ' },
          { status: 400 }
        );
      }
      if (!emailDeliveryConfigured()) {
        return NextResponse.json({ success: false, message: 'Chức năng gửi mã khôi phục chưa sẵn sàng. Vui lòng thử lại sau.' }, { status: 503 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json(
          { success: false, message: 'Không thể kết nối cơ sở dữ liệu' },
          { status: 503 }
        );
      }

      await ensureDefaultAdminSeeded();

      const user = await UserModel.findOne({ email }).lean();
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Không tìm thấy tài khoản nào đăng ký với địa chỉ Email này' },
          { status: 404 }
        );
      }

      if (user.status === 'locked') {
        return NextResponse.json(
          { success: false, message: 'Tài khoản này đã bị khóa bởi Quản trị viên' },
          { status: 403 }
        );
      }

      const existingOtp = await OtpModel.findOne({ email, purpose: 'reset_password' }).lean();
      if (
        existingOtp &&
        existingOtp.lastSentAt &&
        Date.now() - new Date(existingOtp.lastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS
      ) {
        const waitSec = Math.ceil(
          (OTP_RESEND_COOLDOWN_MS - (Date.now() - new Date(existingOtp.lastSentAt).getTime())) / 1000
        );
        return NextResponse.json(
          { success: false, message: `Vui lòng chờ ${waitSec} giây trước khi yêu cầu gửi lại mã OTP` },
          { status: 429 }
        );
      }

      const otpCode = generateOtpCode();
      const { hash: otpHash, salt: otpSalt } = hashOtpCode(otpCode);

      await OtpModel.findOneAndUpdate(
        { email, purpose: 'reset_password' },
        {
          email,
          purpose: 'reset_password',
          otpHash,
          otpSalt,
          attempts: 0,
          maxAttempts: 5,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
          lastSentAt: new Date()
        },
        { upsert: true, new: true }
      );

      const mailRes = await sendOtpEmail({
        email,
        otpCode,
        purpose: 'reset_password',
        fullName: user.fullName
      });

      return NextResponse.json({
        success: true,
        message: `Mã OTP khôi phục mật khẩu đã được gửi tới ${email}`,
        email,
        expiresInSeconds: 300,
        devOtpPreview: mailRes.devOtpPreview
      });
    } catch (error) {
      console.error('Lỗi sendForgotPasswordOtp:', error);
      return NextResponse.json(
        { success: false, message: 'Chưa thể gửi mã khôi phục. Vui lòng thử lại sau.' },
        { status: 503 }
      );
    }
  }

  /**
   * POST /api/auth/forgot-password/reset — Bước 2 Quên mật khẩu: Xác nhận OTP & Đặt mật khẩu mới
   */
  static async resetPasswordWithOtp(request: Request) {
    try {
      const body = await request.json();
      const email = String(body.email || '').trim().toLowerCase();
      const otp = String(body.otp || '').trim();
      const newPassword = String(body.newPassword || '');

      if (!isValidEmail(email) || !/^\d{6}$/.test(otp)) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập đầy đủ mã OTP 6 chữ số' },
          { status: 400 }
        );
      }

      const pwError = validatePasswordStrength(newPassword);
      if (pwError) {
        return NextResponse.json({ success: false, message: pwError }, { status: 400 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json(
          { success: false, message: 'Không thể kết nối cơ sở dữ liệu' },
          { status: 503 }
        );
      }

      const otpDoc = await OtpModel.findOne({ email, purpose: 'reset_password' });
      if (!otpDoc || new Date(otpDoc.expiresAt).getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, message: 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng gửi lại mã mới!' },
          { status: 400 }
        );
      }

      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        await OtpModel.deleteOne({ _id: otpDoc._id });
        return NextResponse.json(
          { success: false, message: 'Bạn đã nhập sai OTP quá 5 lần. Vui lòng yêu cầu gửi lại mã mới!' },
          { status: 429 }
        );
      }

      const isValid = verifyOtpCode(otp, otpDoc.otpHash, otpDoc.otpSalt);
      if (!isValid) {
        otpDoc.attempts += 1;
        await otpDoc.save();
        const remaining = Math.max(0, otpDoc.maxAttempts - otpDoc.attempts);
        return NextResponse.json(
          {
            success: false,
            message: `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
          },
          { status: 400 }
        );
      }

      const user = await UserModel.findOne({ email });
      if (!user) {
        await OtpModel.deleteOne({ _id: otpDoc._id });
        return NextResponse.json(
          { success: false, message: 'Tài khoản không tồn tại' },
          { status: 404 }
        );
      }

      const { hash, salt } = hashPassword(newPassword);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      user.sessionVersion = (user.sessionVersion || 1) + 1;
      user.lastLoginAt = new Date();
      await user.save();

      await OtpModel.deleteOne({ _id: otpDoc._id });

      const safeUser = toSafeUserDTO(user);
      const response = NextResponse.json({
        success: true,
        message: 'Đặt lại mật khẩu mới thành công! Đã tự động đăng nhập vào tài khoản của bạn.',
        user: safeUser
      });

      setUserSessionCookie(response, {
        userId: user.userId,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion
      });

      if (user.role === 'admin') {
        createAdminSession(response);
      }

      return response;
    } catch (error) {
      console.error('Lỗi resetPasswordWithOtp:', error);
      return NextResponse.json(
        { success: false, message: 'Lỗi máy chủ khi đặt lại mật khẩu' },
        { status: 500 }
      );
    }
  }
}
