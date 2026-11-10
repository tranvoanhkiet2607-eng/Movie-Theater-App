// Middleware xác thực token và kiểm tra phân quyền (RBAC)
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware xác thực người dùng qua JWT token
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập: Không tìm thấy token xác thực.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token xác thực không hợp lệ hoặc đã hết hạn.',
    });
  }
}

/**
 * Middleware kiểm tra quyền Quản trị viên (Admin)
 */
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập: Không tìm thấy token xác thực.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Từ chối truy cập: Chức năng này yêu cầu quyền Quản trị viên (Admin).',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Token xác thực không hợp lệ hoặc đã hết hạn.',
    });
  }
}

/**
 * Middleware xác thực tùy chọn (nếu có token thì gán req.user, không có thì bỏ qua)
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (_) {
    // Bỏ qua lỗi token ở optionalAuth
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth,
};

