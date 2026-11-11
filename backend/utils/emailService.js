const nodemailer = require('nodemailer');

/**
 * Khởi tạo Transporter cho Nodemailer
 * Hỗ trợ:
 * 1. Gmail qua EMAIL_USER & EMAIL_PASS (App Password 16 ký tự)
 * 2. SMTP tùy chỉnh qua SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * 3. Fallback sang Ethereal Test Account nếu chưa cấu hình trong .env (để dev/test không bị crash)
 */
async function createTransporter() {
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const rawPass = process.env.EMAIL_PASS || '';
  const cleanPass = rawPass.replace(/\s+/g, ''); // Loại bỏ khoảng cách nếu có trong 16 ký tự app password
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort == 465;

  // 1. Nếu có SMTP tùy chỉnh
  if (smtpHost && emailUser && cleanPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure,
      auth: {
        user: emailUser,
        pass: cleanPass,
      },
    });
  }

  // 2. Nếu cấu hình Gmail / Service
  if (emailUser && cleanPass && emailUser !== 'your_email@gmail.com') {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: emailUser,
        pass: cleanPass, // Mật khẩu ứng dụng (App Password)
      },
    });
  }

  // 3. Nếu chưa cấu hình .env -> Tạo tài khoản test Ethereal tự động
  console.warn(
    '[emailService] Chưa phát hiện cấu hình EMAIL_USER và EMAIL_PASS trong backend/.env. Đang khởi tạo tài khoản test Ethereal...'
  );
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    console.error('[emailService] Không thể tạo Ethereal transporter:', err.message);
    return null;
  }
}

/**
 * Gửi email chứa mã OTP khôi phục mật khẩu thật đến hộp thư của người dùng
 */
async function sendPasswordResetEmail({ to, fullName, otp, expiresMinutes = 5 }) {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      throw new Error(
        'Không thể khởi tạo dịch vụ gửi email. Vui lòng cấu hình EMAIL_USER và EMAIL_PASS trong file backend/.env'
      );
    }

    const fromAddress =
      process.env.EMAIL_FROM ||
      `"CineMax Theater" <${process.env.EMAIL_USER || 'no-reply@cinemax.vn'}>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã OTP Khôi Phục Mật Khẩu - CineMax Theater</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0E14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E5E7EB;
    }
    .wrapper {
      width: 100%;
      background-color: #0B0E14;
      padding: 30px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #161A26;
      border-radius: 16px;
      border: 1px solid #252C3E;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .header-bar {
      background: linear-gradient(135deg, #E50914 0%, #99060D 100%);
      padding: 24px;
      text-align: center;
    }
    .header-title {
      margin: 0;
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .header-sub {
      margin: 6px 0 0 0;
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 15px;
      color: #FFFFFF;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .intro-text {
      font-size: 14px;
      color: #9CA3AF;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .otp-box {
      background-color: #12151E;
      border: 1.5px dashed #E50914;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .otp-label {
      font-size: 12px;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-size: 38px;
      font-weight: 800;
      color: #E50914;
      letter-spacing: 10px;
      font-family: 'Courier New', Courier, monospace;
      margin: 8px 0;
      user-select: all;
    }
    .otp-expire {
      font-size: 12.5px;
      color: #F59E0B;
      margin-top: 8px;
      font-weight: 500;
    }
    .security-note {
      background-color: rgba(239, 68, 68, 0.08);
      border-left: 3px solid #EF4444;
      padding: 12px 14px;
      border-radius: 0 8px 8px 0;
      margin-top: 24px;
      font-size: 12.5px;
      color: #D1D5DB;
      line-height: 1.5;
    }
    .security-title {
      font-weight: 700;
      color: #EF4444;
      margin-bottom: 4px;
    }
    .footer {
      border-top: 1px solid #202636;
      padding: 18px 24px;
      text-align: center;
      background-color: #141824;
      font-size: 11.5px;
      color: #6B7280;
      line-height: 1.6;
    }
    .footer a {
      color: #E50914;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar">
        <h1 class="header-title">🎬 CineMax Theater</h1>
        <p class="header-sub">Hệ Thống Đặt Vé Xem Phim Trực Tuyến</p>
      </div>

      <div class="content">
        <p class="greeting">Xin chào ${fullName || 'Quý khách'},</p>
        <p class="intro-text">
          Chúng tôi nhận được yêu cầu cấp lại mật khẩu cho tài khoản CineMax liên kết với email này. Vui lòng nhập mã OTP bên dưới để xác minh danh tính và tạo mật khẩu mới:
        </p>

        <div class="otp-box">
          <div class="otp-label">MÃ XÁC THỰC OTP CỦA BẠN</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-expire">⏱️ Mã có hiệu lực trong vòng ${expiresMinutes} phút</div>
        </div>

        <div class="security-note">
          <div class="security-title">⚠️ Lưu ý bảo mật:</div>
          Tuyệt đối không chia sẻ mã này cho bất kỳ ai (kể cả nhân viên CineMax). Nếu bạn không yêu cầu đặt lại mật khẩu, xin hãy bỏ qua email này để bảo vệ tài khoản.
        </div>
      </div>

      <div class="footer">
        © 2026 CineMax Theater. Mọi quyền được bảo lưu.<br>
        Hotline CSKH: 1900 6017 • Email hỗ trợ: <a href="mailto:support@cinemax.vn">support@cinemax.vn</a>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
[CineMax Theater] MÃ XÁC NHẬN ĐẶT LẠI MẬT KHẨU

Xin chào ${fullName || 'Quý khách'},

Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản CineMax.
Mã OTP xác thực của bạn là: ${otp}

Mã có hiệu lực trong vòng ${expiresMinutes} phút.
Tuyệt đối không chia sẻ mã này cho bất kỳ ai để đảm bảo an toàn tài khoản.

Trân trọng,
CineMax Theater Team
Hotline: 1900 6017
    `;

    const mailOptions = {
      from: fromAddress,
      to,
      subject: `[CineMax] Mã xác thực OTP: ${otp} (Đặt lại mật khẩu)`,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[emailService] Đã gửi mã OTP (${otp}) tới email '${to}'. MessageId: ${info.messageId}`);

    // Nếu dùng Ethereal test account, in URL xem email test
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[emailService] Preview email tại URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    console.error(`[emailService] Lỗi khi gửi email tới '${to}':`, err);
    throw err;
  }
}

/**
 * Gửi email chứa mã OTP xác thực đăng ký tài khoản mới thật đến hộp thư của người dùng
 */
async function sendRegistrationOtpEmail({ to, fullName, otp, expiresMinutes = 5 }) {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      throw new Error(
        'Không thể khởi tạo dịch vụ gửi email. Vui lòng cấu hình EMAIL_USER và EMAIL_PASS trong file backend/.env'
      );
    }

    const fromAddress =
      process.env.EMAIL_FROM ||
      `"CineMax Theater" <${process.env.EMAIL_USER || 'no-reply@cinemax.vn'}>`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác Thực Đăng Ký Tài Khoản - CineMax Theater</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0E14;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E5E7EB;
    }
    .wrapper {
      width: 100%;
      background-color: #0B0E14;
      padding: 30px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #161A26;
      border-radius: 16px;
      border: 1px solid #252C3E;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .header-bar {
      background: linear-gradient(135deg, #E50914 0%, #99060D 100%);
      padding: 24px;
      text-align: center;
    }
    .header-title {
      margin: 0;
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .header-sub {
      margin: 6px 0 0 0;
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 16px;
      color: #FFFFFF;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 12px;
    }
    .intro-text {
      font-size: 14px;
      color: #9CA3AF;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .benefit-box {
      background-color: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 13px;
      color: #FBBF24;
      display: flex;
      align-items: center;
    }
    .otp-box {
      background-color: #12151E;
      border: 1.5px dashed #E50914;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    .otp-label {
      font-size: 12px;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-size: 38px;
      font-weight: 800;
      color: #E50914;
      letter-spacing: 10px;
      font-family: 'Courier New', Courier, monospace;
      margin: 8px 0;
      user-select: all;
    }
    .otp-expire {
      font-size: 12.5px;
      color: #F59E0B;
      margin-top: 8px;
      font-weight: 500;
    }
    .security-note {
      background-color: rgba(239, 68, 68, 0.08);
      border-left: 3px solid #EF4444;
      padding: 12px 14px;
      border-radius: 0 8px 8px 0;
      margin-top: 24px;
      font-size: 12.5px;
      color: #D1D5DB;
      line-height: 1.5;
    }
    .security-title {
      font-weight: 700;
      color: #EF4444;
      margin-bottom: 4px;
    }
    .footer {
      border-top: 1px solid #202636;
      padding: 18px 24px;
      text-align: center;
      background-color: #141824;
      font-size: 11.5px;
      color: #6B7280;
      line-height: 1.6;
    }
    .footer a {
      color: #E50914;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar">
        <h1 class="header-title">🎬 CineMax Theater</h1>
        <p class="header-sub">Hệ Thống Đặt Vé Xem Phim Trực Tuyến</p>
      </div>

      <div class="content">
        <p class="greeting">Xin chào ${fullName || 'Quý khách'},</p>
        <p class="intro-text">
          Cảm ơn bạn đã lựa chọn đăng ký tài khoản thành viên tại <strong>CineMax Theater</strong>. Để xác thực địa chỉ email và hoàn tất kích hoạt tài khoản, vui lòng nhập mã OTP bên dưới vào ứng dụng:
        </p>

        <div class="benefit-box">
          🎁 Đăng ký thành công bạn sẽ nhận ngay <strong>+50 điểm thưởng chào mừng</strong> và voucher ưu đãi combo bắp nước!
        </div>

        <div class="otp-box">
          <div class="otp-label">MÃ XÁC THỰC ĐĂNG KÝ (OTP)</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-expire">⏱️ Mã có hiệu lực trong vòng ${expiresMinutes} phút</div>
        </div>

        <div class="security-note">
          <div class="security-title">⚠️ Lưu ý bảo mật:</div>
          Mã xác thực chỉ dùng cho việc kích hoạt tài khoản của bạn. Tuyệt đối không cung cấp mã OTP cho người khác để bảo vệ an toàn thông tin cá nhân.
        </div>
      </div>

      <div class="footer">
        © 2026 CineMax Theater. Mọi quyền được bảo lưu.<br>
        Hotline CSKH: 1900 6017 • Email hỗ trợ: <a href="mailto:support@cinemax.vn">support@cinemax.vn</a>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
[CineMax Theater] MÃ XÁC THỰC ĐĂNG KÝ TÀI KHOẢN

Xin chào ${fullName || 'Quý khách'},

Cảm ơn bạn đã lựa chọn đăng ký tài khoản thành viên tại CineMax Theater.
Mã OTP xác thực email của bạn là: ${otp}

Mã có hiệu lực trong vòng ${expiresMinutes} phút.
Vui lòng nhập mã này vào ứng dụng để hoàn tất đăng ký tài khoản và nhận 50 điểm thưởng chào mừng.

Trân trọng,
CineMax Theater Team
Hotline: 1900 6017
    `;

    const mailOptions = {
      from: fromAddress,
      to,
      subject: `[CineMax] Mã xác thực đăng ký tài khoản: ${otp}`,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[emailService] Đã gửi mã OTP đăng ký (${otp}) tới email '${to}'. MessageId: ${info.messageId}`);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[emailService] Preview email đăng ký tại URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    console.error(`[emailService] Lỗi khi gửi email đăng ký tới '${to}':`, err);
    throw err;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendRegistrationOtpEmail,
};

