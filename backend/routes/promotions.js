// Anh Kiệt - CE180795
// API Routes: UC31 (Apply Promotion)
const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');

// ════════════════════════════════════════════════════════════════════════════
// GET /api/promotions
// Lấy danh sách mã khuyến mãi đang hoạt động
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      promotions,
    });
  } catch (error) {
    console.error('[GET /api/promotions]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách khuyến mãi.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/promotions/apply
// UC31: Kiểm tra tính hợp lệ của mã khuyến mãi và tính số tiền được giảm
// ════════════════════════════════════════════════════════════════════════════
router.post('/apply', async (req, res) => {
  try {
    const { code, orderTotal = 0 } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã khuyến mãi.',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const promo = await Promotion.findOne({ code: cleanCode });

    if (!promo) {
      return res.status(404).json({
        success: false,
        message: `Mã khuyến mãi "${cleanCode}" không tồn tại hoặc đã hết hạn.`,
      });
    }

    if (!promo.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Mã khuyến mãi này hiện đang tạm ngưng sử dụng.',
      });
    }

    const now = new Date();
    if (promo.startDate && promo.startDate > now) {
      return res.status(400).json({
        success: false,
        message: 'Chương trình khuyến mãi này chưa tới thời gian áp dụng.',
      });
    }

    if (promo.endDate && promo.endDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Mã khuyến mãi này đã hết hạn sử dụng.',
      });
    }

    if (promo.minOrderAmount && orderTotal < promo.minOrderAmount) {
      const formattedMin = promo.minOrderAmount.toLocaleString('vi-VN');
      return res.status(400).json({
        success: false,
        message: `Mã "${cleanCode}" yêu cầu đơn hàng tối thiểu từ ${formattedMin}đ (Hiện tại: ${orderTotal.toLocaleString('vi-VN')}đ).`,
      });
    }

    // Tính số tiền được giảm
    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = Math.round((orderTotal * promo.discountValue) / 100);
      if (promo.maxDiscount && promo.maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, promo.maxDiscount);
      }
    } else {
      discountAmount = promo.discountValue;
    }

    // Không để giảm vượt quá tổng đơn
    discountAmount = Math.min(discountAmount, orderTotal);
    const finalTotal = Math.max(0, orderTotal - discountAmount);

    return res.json({
      success: true,
      message: `Áp dụng thành công mã "${cleanCode}"! Giảm ${discountAmount.toLocaleString('vi-VN')}đ.`,
      discountAmount,
      finalTotal,
      promotion: {
        code: promo.code,
        title: promo.title,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
    });
  } catch (error) {
    console.error('[POST /api/promotions/apply]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi áp dụng mã khuyến mãi.',
    });
  }
});

module.exports = router;

