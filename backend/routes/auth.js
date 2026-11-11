const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPasswordResetEmail, sendRegistrationOtpEmail } = require('../utils/emailService');

// ─── Helper: Tạo JWT token ──────────────────────────────────────────────────
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
}

// ─── Helper: Mask email/phone cho privacy ───────────────────────────────────
function maskIdentifier(id) {
  if (id.includes('@')) {
    const [name, domain] = id.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  }
  if (id.length >= 7) return `${id.slice(0, 3)}****${id.slice(-3)}`;
  return id;
}

// In-memory OTP sessions (có thể nâng cấp lên Redis sau)
const resetSessions = new Map();
const registrationSessions = new Map();

// ════════════════════════════════════════════════════════════
// POST /api/auth/register/send-otp & /api/auth/register/request-otp
// Gửi mã OTP xác thực email thật về hòm thư khi đăng ký
// ════════════════════════════════════════════════════════════
async function handleRegisterSendOtp(req, res) {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ họ tên, email, số điện thoại và mật khẩu.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Kiểm tra định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không đúng định dạng.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
    }

    // Kiểm tra trùng email trong DB
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được đăng ký tài khoản. Vui lòng dùng Email khác hoặc Đăng nhập.',
      });
    }

    // Kiểm tra trùng SĐT trong DB
    const phoneExists = await User.findOne({ phone: cleanPhone });
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại này đã được liên kết với một tài khoản khác.',
      });
    }

    // Tạo mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    // Lưu phiên đăng ký
    registrationSessions.set(cleanEmail, {
      otp,
      expiresAt,
      userData: {
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password,
      },
    });

    // Gửi email thật tới người dùng
    try {
      await sendRegistrationOtpEmail({
        to: cleanEmail,
        fullName: fullName.trim(),
        otp,
        expiresMinutes: 5,
      });
    } catch (mailError) {
      console.error('[registerSendOtp] Lỗi gửi email OTP thật:', mailError.message);
      return res.status(500).json({
        success: false,
        message: `Không thể gửi email OTP đến ${cleanEmail}. Lỗi dịch vụ mail: ${mailError.message}`,
      });
    }

    return res.json({
      success: true,
      message: `Mã OTP xác thực tài khoản đã được gửi đến email ${cleanEmail}. Vui lòng kiểm tra hộp thư đến (hoặc Thư rác/Spam).`,
      maskedTarget: maskIdentifier(cleanEmail),
      targetEmail: cleanEmail,
    });
  } catch (err) {
    console.error('[registerSendOtp]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi mã xác thực đăng ký.' });
  }
}

// ════════════════════════════════════════════════════════════
// POST /api/auth/register/verify-otp
// Xác thực mã OTP và hoàn tất tạo tài khoản mới vào MongoDB
// ════════════════════════════════════════════════════════════
async function handleRegisterVerifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và mã xác thực OTP.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const session = registrationSessions.get(cleanEmail);

    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy yêu cầu đăng ký hoặc phiên xác minh đã kết thúc. Vui lòng bấm Đăng ký lại.',
      });
    }

    if (Date.now() > session.expiresAt) {
      registrationSessions.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực OTP đã hết hạn (quá 5 phút). Vui lòng yêu cầu gửi lại mã mới.',
      });
    }

    if (session.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại email của bạn.',
      });
    }

    // Kiểm tra lần cuối tránh trùng lặp
    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: session.userData.phone }],
    });
    if (userExists) {
      registrationSessions.delete(cleanEmail);
      return res.status(409).json({
        success: false,
        message: 'Email hoặc Số điện thoại đã được đăng ký tài khoản.',
      });
    }

    // Tạo User trong MongoDB
    const newUser = await User.create({
      fullName: session.userData.fullName,
      email: session.userData.email,
      phone: session.userData.phone,
      password: session.userData.password,
      membershipTier: 'Standard',
      loyaltyPoints: 50,
      avatarUrl: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(session.userData.fullName)}`,
    });

    // Xóa session OTP sau khi đăng ký thành công
    registrationSessions.delete(cleanEmail);

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Xác thực tài khoản thành công! Chào mừng bạn gia nhập CineMax với 50 điểm thưởng chào mừng.',
      token,
      user: newUser.toJSON(),
    });
  } catch (err) {
    console.error('[registerVerifyOtp]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi hoàn tất đăng ký tài khoản.' });
  }
}

router.post('/register/send-otp', handleRegisterSendOtp);
router.post('/register/request-otp', handleRegisterSendOtp);
router.post('/register/verify-otp', handleRegisterVerifyOtp);

// ════════════════════════════════════════════════════════════
// POST /api/auth/register
// Hỗ trợ cả 2 luồng: nếu có otp thì xác thực, nếu không thì tạo trực tiếp (backward compatible)
// ════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
  if (req.body.otp) {
    return handleRegisterVerifyOtp(req, res);
  }
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    // Kiểm tra trùng email
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được đăng ký tài khoản. Vui lòng dùng Email khác hoặc Đăng nhập.',
      });
    }

    // Kiểm tra trùng SĐT
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(409).json({
        success: false,
        message: 'Số điện thoại này đã được liên kết với một tài khoản khác.',
      });
    }

    // Tạo user mới (password sẽ được hash tự động qua pre-save hook)
    const newUser = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      membershipTier: 'Standard',
      loyaltyPoints: 50, // Điểm chào mừng
      avatarUrl: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(fullName.trim())}`,
    });

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Bạn nhận được 50 điểm thưởng chào mừng.',
      token,
      user: newUser.toJSON(),
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ. Vui lòng thử lại.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/auth/login
// ════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, rememberMe } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Email/SĐT và mật khẩu.' });
    }

    const searchTarget = identifier.trim().toLowerCase();

    // Tìm theo email hoặc SĐT, include password field
    const foundUser = await User.findOne({
      $or: [{ email: searchTarget }, { phone: identifier.trim() }],
    }).select('+password');

    if (!foundUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với Email hoặc Số điện thoại này.',
      });
    }

    if (foundUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị vô hiệu hóa bởi ban quản trị. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.',
      });
    }

    const isMatch = await foundUser.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      });
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign({ id: foundUser._id }, process.env.JWT_SECRET, { expiresIn });

    return res.json({
      success: true,
      message: `Chào mừng ${foundUser.fullName} quay trở lại!`,
      token,
      user: foundUser.toJSON(),
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ. Vui lòng thử lại.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/auth/me  (lấy thông tin user từ token)
// ════════════════════════════════════════════════════════════
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token xác thực.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }

    return res.json({ success: true, user: user.toJSON() });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/auth/profile  (cập nhật hồ sơ)
// ════════════════════════════════════════════════════════════
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token xác thực.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { fullName, phone, avatarUrl } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { fullName, phone, avatarUrl },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }

    return res.json({ success: true, message: 'Cập nhật thông tin thành công!', user: updatedUser.toJSON() });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ success: false, message: 'Cập nhật thất bại. Vui lòng thử lại.' });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/auth/change-password
// ════════════════════════════════════════════════════════════
router.put('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token xác thực.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ thông tin.' });
    }

    const user = await User.findById(decoded.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới không được trùng với mật khẩu cũ.' });
    }

    user.password = newPassword;
    await user.save(); // trigger pre-save hash

    return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ success: false, message: 'Đổi mật khẩu thất bại. Vui lòng thử lại.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password & /api/auth/forgot-password/request-otp  (gửi OTP thật qua email)
// ════════════════════════════════════════════════════════════
async function handleForgotPassword(req, res) {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập Email hoặc Số điện thoại.' });
    }

    const trimmed = identifier.trim();
    const user = await User.findOne({
      $or: [{ email: trimmed.toLowerCase() }, { phone: trimmed }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản nào khớp với thông tin này trong hệ thống.',
      });
    }

    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản chưa được liên kết địa chỉ Email để nhận mã OTP.',
      });
    }

    // Tạo mã OTP 6 chữ số ngẫu nhiên
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Hiệu lực 5 phút
    resetSessions.set(user.email, { code: otp, expiresAt, verified: false });

    // Gửi email thực tế chứa mã OTP tới hộp thư của người dùng
    let emailResult;
    try {
      emailResult = await sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName || user.email.split('@')[0],
        otp,
        expiresMinutes: 5,
      });
    } catch (mailError) {
      console.error('[forgotPassword] Lỗi gửi email thực tế:', mailError.message);
      return res.status(500).json({
        success: false,
        message: `Không thể gửi email OTP đến ${user.email}. Lỗi máy chủ: ${mailError.message}`,
      });
    }

    const masked = maskIdentifier(user.email);

    return res.json({
      success: true,
      message: `Mã xác minh OTP đã được gửi đến email ${user.email}. Vui lòng kiểm tra hộp thư đến (và thư mục Spam/Thư rác).`,
      maskedTarget: masked,
      targetEmail: user.email,
      previewUrl: emailResult?.previewUrl || null,
    });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi yêu cầu đặt lại mật khẩu.' });
  }
}

router.post('/forgot-password', handleForgotPassword);
router.post('/forgot-password/request-otp', handleForgotPassword);

// ════════════════════════════════════════════════════════════
// POST /api/auth/verify-otp & /api/auth/forgot-password/verify-otp
// ════════════════════════════════════════════════════════════
async function handleVerifyOtp(req, res) {
  try {
    const { identifier, code } = req.body;
    if (!identifier || !code) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã xác minh OTP.' });
    }

    const trimmed = identifier.trim();
    const user = await User.findOne({
      $or: [{ email: trimmed.toLowerCase() }, { phone: trimmed }],
    });

    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

    const session = resetSessions.get(user.email);
    if (!session) {
      return res.status(400).json({ success: false, message: 'Chưa có yêu cầu xác minh hoặc mã đã hết hiệu lực.' });
    }

    if (Date.now() > session.expiresAt) {
      resetSessions.delete(user.email);
      return res.status(400).json({ success: false, message: 'Mã xác minh đã hết hạn (quá 5 phút). Vui lòng gửi lại.' });
    }

    if (session.code !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Mã xác minh OTP không chính xác. Vui lòng kiểm tra lại email.' });
    }

    session.verified = true;
    resetSessions.set(user.email, session);

    return res.json({ success: true, message: 'Xác minh danh tính thành công! Bạn có thể đặt mật khẩu mới.' });
  } catch (err) {
    console.error('[verifyOtp]', err);
    return res.status(500).json({ success: false, message: 'Lỗi xác minh danh tính.' });
  }
}

router.post('/verify-otp', handleVerifyOtp);
router.post('/forgot-password/verify-otp', handleVerifyOtp);

// ════════════════════════════════════════════════════════════
// POST /api/auth/reset-password & /api/auth/forgot-password/reset-password
// ════════════════════════════════════════════════════════════
async function handleResetPassword(req, res) {
  try {
    const { identifier, code, newPassword } = req.body;
    const trimmed = identifier.trim();
    const user = await User.findOne({
      $or: [{ email: trimmed.toLowerCase() }, { phone: trimmed }],
    }).select('+password');

    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });

    const session = resetSessions.get(user.email);
    if (!session || !session.verified || session.code !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Danh tính chưa được xác minh hợp lệ.' });
    }

    if (Date.now() > session.expiresAt) {
      resetSessions.delete(user.email);
      return res.status(400).json({ success: false, message: 'Phiên xác minh đã hết hạn.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    user.password = newPassword;
    await user.save();
    resetSessions.delete(user.email);

    return res.json({ success: true, message: 'Khôi phục mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật mật khẩu mới.' });
  }
}

router.post('/reset-password', handleResetPassword);
router.post('/forgot-password/reset-password', handleResetPassword);

// ════════════════════════════════════════════════════════════
// DELETE /api/auth/account  (xóa tài khoản)
// ════════════════════════════════════════════════════════════
router.delete('/account', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Không có token xác thực.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await User.findByIdAndDelete(decoded.id);

    return res.json({ success: true, message: 'Tài khoản của bạn đã được xóa thành công.' });
  } catch (err) {
    console.error('[deleteAccount]', err);
    return res.status(500).json({ success: false, message: 'Xóa tài khoản thất bại.' });
  }
});

module.exports = router;
