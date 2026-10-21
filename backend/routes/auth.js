const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

// ════════════════════════════════════════════════════════════
// POST /api/auth/register
// ════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
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
// POST /api/auth/forgot-password  (gửi OTP)
// ════════════════════════════════════════════════════════════
router.post('/forgot-password', async (req, res) => {
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút
    resetSessions.set(user.email, { code: otp, expiresAt, verified: false });

    const masked = maskIdentifier(trimmed.includes('@') ? user.email : user.phone);

    return res.json({
      success: true,
      message: `Mã xác minh đã được gửi đến ${masked}. Vui lòng kiểm tra và nhập mã để tiếp tục.`,
      demoOtp: otp, // Chỉ dùng cho demo — production cần gửi qua email/SMS
      maskedTarget: masked,
    });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi yêu cầu đặt lại mật khẩu.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/auth/verify-otp
// ════════════════════════════════════════════════════════════
router.post('/verify-otp', async (req, res) => {
  try {
    const { identifier, code } = req.body;
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
      return res.status(400).json({ success: false, message: 'Mã xác minh không chính xác.' });
    }

    session.verified = true;
    resetSessions.set(user.email, session);

    return res.json({ success: true, message: 'Xác minh danh tính thành công! Bạn có thể đặt mật khẩu mới.' });
  } catch (err) {
    console.error('[verifyOtp]', err);
    return res.status(500).json({ success: false, message: 'Lỗi xác minh danh tính.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// ════════════════════════════════════════════════════════════
router.post('/reset-password', async (req, res) => {
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
});

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
