const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// ─── Middleware: Xác thực quyền Admin / Quản trị ─────────────────────────────
async function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Yêu cầu token xác thực.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Tài khoản không tồn tại.' });
    }

    // Cho phép admin và manager thao tác quản trị
    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền quản trị viên để thực hiện thao tác này.',
      });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

// ─── Bảng ma trận phân quyền (Role & Permission Matrix) ──────────────────────
const ROLE_PERMISSIONS_MATRIX = {
  customer: {
    roleName: 'Khách hàng',
    description: 'Người dùng xem phim, đặt vé, tích điểm thành viên và quản lý thông tin cá nhân',
    badgeColor: '#3B82F6',
    permissions: [
      { code: 'movie:view', name: 'Xem phim & lịch chiếu', granted: true },
      { code: 'booking:create', name: 'Đặt vé xem phim', granted: true },
      { code: 'booking:history', name: 'Xem lịch sử đặt vé & E-Ticket', granted: true },
      { code: 'membership:points', name: 'Tích điểm & đổi voucher hội viên', granted: true },
      { code: 'profile:edit', name: 'Quản lý thông tin & đổi mật khẩu', granted: true },
      { code: 'ticket:checkin', name: 'Soát vé & quét mã QR vào rạp', granted: false },
      { code: 'account:manage', name: 'Quản trị danh sách tài khoản', granted: false },
      { code: 'role:manage', name: 'Phân quyền & đổi vai trò', granted: false },
    ],
  },
  staff: {
    roleName: 'Nhân viên rạp',
    description: 'Nhân viên tại quầy vé và cửa soát vé, kiểm tra E-Ticket khách hàng',
    badgeColor: '#10B981',
    permissions: [
      { code: 'movie:view', name: 'Xem phim & lịch chiếu', granted: true },
      { code: 'booking:create', name: 'Đặt vé tại quầy', granted: true },
      { code: 'booking:history', name: 'Tra cứu thông tin vé khách hàng', granted: true },
      { code: 'membership:points', name: 'Tra cứu điểm hội viên', granted: true },
      { code: 'profile:edit', name: 'Quản lý thông tin cá nhân', granted: true },
      { code: 'ticket:checkin', name: 'Soát vé & quét mã QR vào rạp', granted: true },
      { code: 'account:manage', name: 'Quản trị danh sách tài khoản', granted: false },
      { code: 'role:manage', name: 'Phân quyền & đổi vai trò', granted: false },
    ],
  },
  manager: {
    roleName: 'Quản lý cụm rạp',
    description: 'Giám sát hoạt động rạp, quản lý tài khoản nhân viên và theo dõi lịch chiếu',
    badgeColor: '#F59E0B',
    permissions: [
      { code: 'movie:view', name: 'Xem phim & lịch chiếu', granted: true },
      { code: 'booking:create', name: 'Đặt vé & hỗ trợ khách', granted: true },
      { code: 'booking:history', name: 'Quản lý toàn bộ lịch sử vé', granted: true },
      { code: 'membership:points', name: 'Quản lý chính sách hội viên', granted: true },
      { code: 'profile:edit', name: 'Quản lý thông tin cá nhân', granted: true },
      { code: 'ticket:checkin', name: 'Soát vé & giải quyết tranh chấp vé', granted: true },
      { code: 'account:manage', name: 'Xem & cập nhật tài khoản nhân viên', granted: true },
      { code: 'role:manage', name: 'Phân quyền nhân viên rạp', granted: true },
    ],
  },
  admin: {
    roleName: 'Quản trị viên tối cao',
    description: 'Toàn quyền kiểm soát hệ thống, phân quyền, quản trị tài khoản và cấu hình hệ thống',
    badgeColor: '#EF4444',
    permissions: [
      { code: 'movie:view', name: 'Xem phim & lịch chiếu', granted: true },
      { code: 'booking:create', name: 'Đặt vé xem phim', granted: true },
      { code: 'booking:history', name: 'Quản lý toàn bộ vé hệ thống', granted: true },
      { code: 'membership:points', name: 'Toàn quyền cấu hình điểm & voucher', granted: true },
      { code: 'profile:edit', name: 'Quản trị mọi hồ sơ người dùng', granted: true },
      { code: 'ticket:checkin', name: 'Kiểm tra & xác thực vé', granted: true },
      { code: 'account:manage', name: 'Thêm, sửa, vô hiệu hóa tài khoản', granted: true },
      { code: 'role:manage', name: 'Toàn quyền phân quyền vai trò người dùng', granted: true },
    ],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// UC08: Lấy danh sách Vai trò & Ma trận phân quyền (Role Matrix)
// ════════════════════════════════════════════════════════════════════════════
router.get('/roles', (req, res) => {
  return res.json({
    success: true,
    matrix: ROLE_PERMISSIONS_MATRIX,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UC07: Lấy danh sách tất cả tài khoản (Xem & Tìm kiếm & Lọc)
// ════════════════════════════════════════════════════════════════════════════
router.get('/accounts', verifyAdmin, async (req, res) => {
  try {
    const { search, role, status } = req.query;

    const query = {};

    // Tìm kiếm theo tên, email, hoặc số điện thoại
    if (search && search.trim() !== '') {
      const term = search.trim();
      query.$or = [
        { fullName: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ];
    }

    // Lọc theo vai trò
    if (role && role !== 'all') {
      query.role = role;
    }

    // Lọc theo trạng thái
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    const accounts = await User.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: accounts.length,
      accounts: accounts.map((u) => u.toJSON()),
    });
  } catch (err) {
    console.error('[admin:getAccounts]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách tài khoản.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC07: Thêm tài khoản mới (Admin tạo người dùng)
// ════════════════════════════════════════════════════════════════════════════
router.post('/accounts', verifyAdmin, async (req, res) => {
  try {
    const { fullName, email, phone, password, role, membershipTier, loyaltyPoints } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc.' });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(409).json({ success: false, message: 'Email này đã tồn tại trong hệ thống.' });
    }

    const phoneExists = await User.findOne({ phone: phone.trim() });
    if (phoneExists) {
      return res.status(409).json({ success: false, message: 'Số điện thoại này đã được sử dụng.' });
    }

    const assignedRole = role || 'customer';
    const initialPermissions = ROLE_PERMISSIONS_MATRIX[assignedRole]
      ? ROLE_PERMISSIONS_MATRIX[assignedRole].permissions.filter((p) => p.granted).map((p) => p.code)
      : [];

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role: assignedRole,
      membershipTier: membershipTier || 'Standard',
      loyaltyPoints: loyaltyPoints || 0,
      isActive: true,
      permissions: initialPermissions,
      avatarUrl: `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(fullName.trim())}`,
    });

    return res.status(201).json({
      success: true,
      message: `Tạo tài khoản thành công cho ${newUser.fullName}!`,
      account: newUser.toJSON(),
    });
  } catch (err) {
    console.error('[admin:createAccount]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo tài khoản.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC07: Cập nhật thông tin tài khoản
// ════════════════════════════════════════════════════════════════════════════
router.put('/accounts/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, membershipTier, loyaltyPoints } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản để cập nhật.' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone) user.phone = phone.trim();
    if (membershipTier) user.membershipTier = membershipTier;
    if (loyaltyPoints !== undefined) user.loyaltyPoints = Number(loyaltyPoints);

    await user.save();

    return res.json({
      success: true,
      message: 'Cập nhật tài khoản thành công!',
      account: user.toJSON(),
    });
  } catch (err) {
    console.error('[admin:updateAccount]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật tài khoản.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC07: Vô hiệu hóa / Kích hoạt lại tài khoản (Deactivate / Reactivate)
// ════════════════════════════════════════════════════════════════════════════
router.patch('/accounts/:id/status', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    // Không cho phép tự vô hiệu hóa chính mình
    if (req.adminUser && req.adminUser.id === id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Bạn không thể tự vô hiệu hóa tài khoản quản trị của chính mình.',
      });
    }

    user.isActive = Boolean(isActive);
    await user.save();

    const statusText = user.isActive ? 'Kích hoạt' : 'Vô hiệu hóa';
    return res.json({
      success: true,
      message: `Đã ${statusText.toLowerCase()} tài khoản ${user.fullName} thành công!`,
      account: user.toJSON(),
    });
  } catch (err) {
    console.error('[admin:toggleStatus]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái tài khoản.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC08: Cập nhật vai trò & Phân quyền người dùng
// ════════════════════════════════════════════════════════════════════════════
router.patch('/accounts/:id/role', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, customPermissions } = req.body;

    const validRoles = ['customer', 'staff', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò người dùng không hợp lệ.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    // Gán role mới
    user.role = role;

    // Gán danh sách quyền (từ role matrix hoặc custom)
    if (Array.isArray(customPermissions) && customPermissions.length > 0) {
      user.permissions = customPermissions;
    } else if (ROLE_PERMISSIONS_MATRIX[role]) {
      user.permissions = ROLE_PERMISSIONS_MATRIX[role].permissions
        .filter((p) => p.granted)
        .map((p) => p.code);
    }

    await user.save();

    return res.json({
      success: true,
      message: `Đã cập nhật vai trò của ${user.fullName} thành [${ROLE_PERMISSIONS_MATRIX[role].roleName}] thành công!`,
      account: user.toJSON(),
    });
  } catch (err) {
    console.error('[admin:updateRole]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật vai trò người dùng.' });
  }
});

module.exports = router;

