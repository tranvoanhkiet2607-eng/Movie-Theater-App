// UC39: Manage Promotions (Promotion Management)
const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const { requireAdmin } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════
// GET /api/promotions  (Xem danh sách khuyến mãi)
// ════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { activeOnly, search } = req.query;
    const query = {};

    if (activeOnly === 'true') {
      query.isActive = true;
      query.endDate = { $gte: new Date() };
    }

    if (search && search.trim()) {
      query.$or = [
        { code: { $regex: new RegExp(search.trim(), 'i') } },
        { title: { $regex: new RegExp(search.trim(), 'i') } },
      ];
    }

    const promotions = await Promotion.find(query).sort({ createdAt: -1 });
    return res.json({
      success: true,
      promotions: promotions.map((p) => p.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/promotions]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách khuyến mãi.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/promotions/check/:code  (Kiểm tra mã hợp lệ & tính giảm giá)
// ════════════════════════════════════════════════════════════
router.get('/check/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const orderTotal = Number(req.query.orderTotal || 0);

    const promo = await Promotion.findOne({ code });
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Mã khuyến mãi không tồn tại.' });
    }

    if (!promo.isActive) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi này đã bị vô hiệu hóa.' });
    }

    const now = new Date();
    if (promo.endDate && new Date(promo.endDate) < now) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi đã hết hạn sử dụng.' });
    }

    if (promo.startDate && new Date(promo.startDate) > now) {
      return res.status(400).json({ success: false, message: 'Chương trình khuyến mãi chưa bắt đầu.' });
    }

    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ success: false, message: 'Mã khuyến mãi đã hết lượt sử dụng.' });
    }

    if (promo.minOrderValue > 0 && orderTotal < promo.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu phải từ ${promo.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã này.`,
      });
    }

    // Tính toán số tiền giảm giá
    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = Math.round((orderTotal * promo.discountValue) / 100);
      if (promo.maxDiscount > 0 && discountAmount > promo.maxDiscount) {
        discountAmount = promo.maxDiscount;
      }
    } else {
      discountAmount = promo.discountValue;
    }

    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }

    return res.json({
      success: true,
      message: `Áp dụng mã thành công! Bạn được giảm ${discountAmount.toLocaleString('vi-VN')}đ`,
      promotion: promo.toJSON(),
      discountAmount,
    });
  } catch (err) {
    console.error('[GET /api/promotions/check/:code]', err);
    return res.status(500).json({ success: false, message: 'Lỗi kiểm tra mã khuyến mãi.' });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/promotions  (Thêm mới mã khuyến mãi - UC39)
// ════════════════════════════════════════════════════════════
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderValue,
      startDate,
      endDate,
      usageLimit,
      isActive,
    } = req.body;

    if (!code || !title || discountValue === undefined) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền mã code, tiêu đề và mức giảm giá.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Promotion.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Mã khuyến mãi này đã tồn tại trên hệ thống.' });
    }

    const newPromo = await Promotion.create({
      code: cleanCode,
      title: title.trim(),
      description: description ? description.trim() : '',
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : 0,
      minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: usageLimit ? Number(usageLimit) : 1000,
      isActive: isActive !== false,
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo mã khuyến mãi thành công!',
      promotion: newPromo.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/promotions]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo mã khuyến mãi.' });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/promotions/:id  (Sửa thông tin mã khuyến mãi - UC39)
// ════════════════════════════════════════════════════════════
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      discountType,
      discountValue,
      maxDiscount,
      minOrderValue,
      startDate,
      endDate,
      usageLimit,
      isActive,
    } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = Number(discountValue);
    if (maxDiscount !== undefined) updateData.maxDiscount = Number(maxDiscount);
    if (minOrderValue !== undefined) updateData.minOrderValue = Number(minOrderValue);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (usageLimit !== undefined) updateData.usageLimit = Number(usageLimit);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await Promotion.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi để cập nhật.' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật mã khuyến mãi thành công!',
      promotion: updated.toJSON(),
    });
  } catch (err) {
    console.error('[PUT /api/promotions/:id]', err);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật mã khuyến mãi.' });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/promotions/:id/toggle  (Vô hiệu hóa / Kích hoạt lại mã - UC39)
// ════════════════════════════════════════════════════════════
router.patch('/:id/toggle', requireAdmin, async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã khuyến mãi.' });
    }

    promo.isActive = !promo.isActive;
    await promo.save();

    return res.json({
      success: true,
      message: `Đã ${promo.isActive ? 'kích hoạt' : 'vô hiệu hóa'} mã khuyến mãi [${promo.code}]!`,
      promotion: promo.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi thay đổi trạng thái khuyến mãi.' });
  }
});

// ════════════════════════════════════════════════════════════
// DELETE /api/promotions/:id  (Xóa mã khuyến mãi - UC39)
// ════════════════════════════════════════════════════════════
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await Promotion.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mã khuyến mãi để xóa.' });
    }

    return res.json({
      success: true,
      message: 'Đã xóa mã khuyến mãi thành công!',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa mã khuyến mãi.' });
  }
});

module.exports = router;

