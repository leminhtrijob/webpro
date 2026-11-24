import type { OtpPurpose } from '@/models/OtpModel';

export interface SendOtpResult {
  sentViaSmtp: boolean;
  devOtpPreview?: string;
}

/**
 * Dịch vụ gửi Email OTP xác thực tài khoản & khôi phục mật khẩu cho TriKun Love Studio.
 * - Nếu đã cấu hình RESEND_API_KEY hoặc SMTP webhook trong biến môi trường, hệ thống gửi email thật.
 * - Ở môi trường phát triển (Localhost / Demo chưa gắn SMTP), hệ thống in khung OTP ra terminal
 *   đồng thời trả về `devOtpPreview` để giao diện hiển thị thông báo hộp thư ảo giúp test luồng OTP 100% tức thì.
 */
export async function sendOtpEmail(params: {
  email: string;
  otpCode: string;
  purpose: OtpPurpose;
  fullName?: string;
}): Promise<SendOtpResult> {
  const { email, otpCode, purpose, fullName } = params;
  const title =
    purpose === 'register'
      ? 'Xác nhận đăng ký tài khoản TriKun Love Studio'
      : 'Khôi phục mật khẩu tài khoản TriKun Love Studio';

  // Chỉ hiển thị mã trong môi trường phát triển local.
  if (process.env.NODE_ENV !== 'production') console.info(
    `\n╔══════════════════════════════════════════════════════════════╗` +
      `\n║ 💌 TRIKUN LOVE STUDIO — MÃ XÁC THỰC OTP EMAIL                ║` +
      `\n╠══════════════════════════════════════════════════════════════╣` +
      `\n║ • Người nhận : ${email.padEnd(45)}║` +
      `\n║ • Mục đích   : ${(purpose === 'register' ? 'Đăng ký tài khoản mới' : 'Quên mật khẩu').padEnd(45)}║` +
      `\n║ • MÃ OTP     : ${otpCode.padEnd(45)}║` +
      `\n║ • Hiệu lực   : 5 phút                                        ║` +
      `\n╚══════════════════════════════════════════════════════════════╝\n`
  );

  // Hỗ trợ gửi qua Resend API nếu người dùng cấu hình RESEND_API_KEY
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'TriKun Love Studio <onboarding@resend.dev>',
          to: [email],
          subject: `[${otpCode}] ${title}`,
          html: buildOtpHtmlTemplate({ otpCode, purpose, fullName: fullName || email })
        })
      });
      if (res.ok) {
        return { sentViaSmtp: true };
      }
    } catch (err) {
      console.warn('Không thể gửi qua Resend API, chuyển sang chế độ OTP Preview:', err);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Chưa thể gửi email xác nhận. Kiểm tra cấu hình RESEND_API_KEY và EMAIL_FROM.');
  }

  return {
    sentViaSmtp: false,
    devOtpPreview: otpCode
  };
}

function buildOtpHtmlTemplate(params: { otpCode: string; purpose: OtpPurpose; fullName: string }): string {
  const { otpCode, purpose, fullName } = params;
  const safeName = fullName.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
  const actionText =
    purpose === 'register'
      ? 'hoàn tất đăng ký tài khoản mới trên Vũ Trụ Quà Tặng Số TriKun Love Studio'
      : 'đặt lại mật khẩu mới cho tài khoản TriKun Love Studio của bạn';

  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;border-radius:24px;background:linear-gradient(145deg,#FFF5FA,#F8EEFF);border:2px solid #FFB5E0;color:#29104E;">
      <h2 style="margin:0 0 12px;color:#FF1680;font-size:22px;">💖 TriKun Love Studio</h2>
      <p style="font-size:15px;line-height:1.6;">Xin chào <strong>${safeName}</strong>,</p>
      <p style="font-size:14px;line-height:1.6;">Đây là mã xác thực OTP gồm 6 chữ số để ${actionText}:</p>
      <div style="margin:22px 0;padding:18px;border-radius:18px;background:#FFFFFF;border:2px dashed #FF1680;text-align:center;">
        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#FF1680;">${otpCode}</span>
      </div>
      <p style="font-size:12px;color:#6E5566;">Mã OTP có hiệu lực trong vòng <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
    </div>
  `;
}
