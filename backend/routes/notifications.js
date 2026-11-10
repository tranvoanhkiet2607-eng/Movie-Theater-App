// UC42: Manage Notifications (Notification Management)
// UC43: View Notifications (Notification)
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════
// GET /api/notifications  (UC43: Khách hàng xem danh sách thông báo)
// ════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';

    const notifications = await Notification.find({
      $or: [{ targetUser: 'all' }, { targetUser: userId }],
    }).sort({ createdAt: -1 });

    const formatted = notifications.map((n) => {
      const json = n.toJSON();
      json.isRead = n.readBy.includes(userId);
      return json;
    });

    const unreadCount = formatted.filter((n) => !n.isRead).length;

    return res.json({
      success: true,
      unreadCount,
      notifications: formatted,
    });
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tải danh sách thông báo.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/notifications/unread-count  (UC43: Đếm thông báo chưa đọc)
// ════════════════════════════════════════════════════════════
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.query.userId || 'guest';
    const notifications = await Notification.find({
      $or: [{ targetUser: 'all' }, { targetUser: userId }],
      readBy: { $ne: userId },
    });

    return res.json({
      success: true,
      count: notifications.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi đếm thông báo.' });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/notifications/:id/read  (UC43: Đánh dấu một thông báo đã đọc)
// ════════════════════════════════════════════════════════════
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 'guest';

    const notif = await Notification.findById(req.params.id);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
    }

    if (!notif.readBy.includes(userId)) {
      notif.readBy.push(userId);
      await notif.save();
    }

    return res.json({
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc.',
      notification: {
        ...notif.toJSON(),
        isRead: true,
      },
    });
  } catch (err) {
    console.error('[PATCH /api/notifications/:id/read]', err);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đã đọc.' });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/notifications/read-all  (UC43: Đánh dấu tất cả đã đọc)
// ════════════════════════════════════════════════════════════
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId || 'guest';

    await Notification.updateMany(
      {
        $or: [{ targetUser: 'all' }, { targetUser: userId }],
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      }
    );

    return res.json({
      success: true,
      message: 'Đã đánh dấu toàn bộ thông báo là đã đọc!',
    });
  } catch (err) {
    console.error('[PATCH /api/notifications/read-all]', err);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật đọc tất cả.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/notifications/admin/all  (UC42: Quản lý thông báo hệ thống)
// ════════════════════════════════════════════════════════════
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { type, search } = req.query;
    const query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: new RegExp(search.trim(), 'i') } },
        { message: { $regex: new RegExp(search.trim(), 'i') } },
      ];
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: notifications.length,
      notifications: notifications.map((n) => n.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/notifications/admin/all]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tải danh sách thông báo quản trị.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/notifications/admin  (UC42: Tạo thông báo mới)
// ════════════════════════════════════════════════════════════
router.post('/admin', requireAdmin, async (req, res) => {
  try {
    const { title, message, type, targetUser, link } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề và nội dung thông báo.' });
    }

    const newNotif = await Notification.create({
      title: title.trim(),
      message: message.trim(),
      type: type || 'system',
      targetUser: targetUser || 'all',
      link: link || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo và phát thông báo hệ thống thành công!',
      notification: newNotif.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/notifications/admin]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tạo thông báo.' });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/notifications/admin/:id  (UC42: Sửa thông báo hệ thống)
// ════════════════════════════════════════════════════════════
router.put('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { title, message, type, targetUser, link } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (message !== undefined) updateData.message = message.trim();
    if (type !== undefined) updateData.type = type;
    if (targetUser !== undefined) updateData.targetUser = targetUser;
    if (link !== undefined) updateData.link = link;

    const updated = await Notification.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo để cập nhật.' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật thông báo thành công!',
      notification: updated.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/notifications/admin/:id]', err);
    return res.status(500).json({ success: false, message: 'Lỗi sửa thông báo.' });
  }
});

// ════════════════════════════════════════════════════════════
// DELETE /api/notifications/admin/:id  (UC42: Xóa thông báo hệ thống)
// ════════════════════════════════════════════════════════════
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo để xóa.' });
    }

    return res.json({
      success: true,
      message: 'Đã xóa thông báo thành công!',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi xóa thông báo.' });
  }
});

module.exports = router;

