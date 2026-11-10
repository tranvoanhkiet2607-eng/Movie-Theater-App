const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware xác thực token
async function authUser(req, res, next) {
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

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

// ─── Thông tin quy định 4 hạng thẻ hội viên CineMax Privilege ────────────────
const TIERS_CONFIG = {
  Standard: {
    tier: 'Standard',
    name: 'Thành viên Tiêu Chuẩn',
    minPoints: 0,
    maxPoints: 299,
    nextTier: 'Silver',
    nextTierPoints: 300,
    accentColor: '#9CA3AF',
    cardBackground: '#1F2937',
    pointRate: '5% chi tiêu vé',
    benefits: [
      'Tích lũy 5% giá trị vé xem phim',
      'Tặng 01 vé xem phim 2D vào tháng sinh nhật',
      'Nhận thông báo ưu đãi ra mắt phim sớm',
      'Thanh toán tiện lợi qua mã thẻ ảo',
    ],
  },
  Silver: {
    tier: 'Silver',
    name: 'Thành viên Bạc (Silver)',
    minPoints: 300,
    maxPoints: 599,
    nextTier: 'Gold',
    nextTierPoints: 600,
    accentColor: '#E5E7EB',
    cardBackground: '#374151',
    pointRate: '7% chi tiêu vé',
    benefits: [
      'Tích lũy 7% giá trị vé xem phim',
      'Tặng Combo 1 Bắp + 1 Nước vào tháng sinh nhật',
      'Giảm 5% giá bắp nước tại quầy trực tiếp',
      'Ưu tiên chọn ghế đẹp trong phòng chiếu',
      'Bao gồm mọi quyền lợi hạng Tiêu Chuẩn',
    ],
  },
  Gold: {
    tier: 'Gold',
    name: 'Thành viên Vàng (Gold)',
    minPoints: 600,
    maxPoints: 1199,
    nextTier: 'VIP',
    nextTierPoints: 1200,
    accentColor: '#F59E0B',
    cardBackground: '#78350F',
    pointRate: '10% chi tiêu vé',
    benefits: [
      'Tích lũy 10% giá trị vé xem phim',
      'Tặng 02 vé xem phim 2D + 1 Bắp ngọt sinh nhật',
      'Giảm 10% giá bắp nước & combo quầy bar',
      'Tặng 2 lượt miễn phí đổi vé xem phim',
      'Ưu tiên xếp hàng tại quầy vé riêng biệt',
      'Bao gồm mọi quyền lợi hạng Bạc',
    ],
  },
  VIP: {
    tier: 'VIP',
    name: 'Thành viên Kim Cương (VIP)',
    minPoints: 1200,
    maxPoints: 99999,
    nextTier: null,
    nextTierPoints: null,
    accentColor: '#EF4444',
    cardBackground: '#450A0A',
    pointRate: '12% chi tiêu vé',
    benefits: [
      'Tích lũy tối đa 12% giá trị vé xem phim',
      'Miễn phí nâng hạng phòng chiếu IMAX / Gold Class',
      'Đặc quyền sử dụng phòng chờ thương gia VIP Lounge',
      'Vé mời tham dự các sự kiện công chiếu phim bom tấn',
      'Tặng quà tri ân đặc biệt cuối năm từ CineMax',
      'Bao gồm toàn bộ quyền lợi của các hạng dưới',
    ],
  },
};

// ─── Danh mục quà tặng đổi điểm thưởng ──────────────────────────────────────
const REWARDS_CATALOG = [
  {
    id: 'reward_drink',
    title: '01 Ly Coca-Cola / Sprite Lớn',
    category: 'Đồ uống',
    pointsCost: 80,
    icon: 'cafe-outline',
    description: 'Áp dụng cho mọi cụm rạp CineMax trên toàn quốc',
  },
  {
    id: 'reward_popcorn',
    title: '01 Bắp Rang Bơ Caramel Size L',
    category: 'Bắp bơ',
    pointsCost: 150,
    icon: 'fast-food-outline',
    description: 'Thơm lừng vị bơ caramel truyền thống rạp phim',
  },
  {
    id: 'reward_upgrade_vip',
    title: 'Miễn Phí Nâng Hạng Ghế VIP',
    category: 'Đặc quyền',
    pointsCost: 200,
    icon: 'star-outline',
    description: 'Trải nghiệm hàng ghế trung tâm VIP êm ái tốt nhất',
  },
  {
    id: 'reward_ticket_2d',
    title: '01 Vé Xem Phim 2D Tiêu Chuẩn',
    category: 'Vé xem phim',
    pointsCost: 250,
    icon: 'ticket-outline',
    description: 'Đổi vé xem phim 2D cho bất kỳ suất chiếu ngày thường',
  },
  {
    id: 'reward_combo_discount',
    title: 'Voucher Giảm 50.000đ Combo Bắp Nước',
    category: 'Voucher',
    pointsCost: 300,
    icon: 'gift-outline',
    description: 'Khấu trừ trực tiếp khi mua combo bắp nước tại quầy',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// UC10: Lấy thông tin Hội viên & Tiến trình thăng hạng
// ════════════════════════════════════════════════════════════════════════════
router.get('/info', authUser, async (req, res) => {
  try {
    const user = req.user;
    const currentPoints = user.loyaltyPoints || 0;

    // Tự động điều chỉnh hạng thành viên theo số điểm tích lũy
    let calculatedTier = 'Standard';
    if (currentPoints >= 1200) calculatedTier = 'VIP';
    else if (currentPoints >= 600) calculatedTier = 'Gold';
    else if (currentPoints >= 300) calculatedTier = 'Silver';

    if (user.membershipTier !== calculatedTier) {
      user.membershipTier = calculatedTier;
      await user.save();
    }

    const currentConfig = TIERS_CONFIG[calculatedTier];
    let pointsNeeded = 0;
    let progressPercent = 100;

    if (currentConfig.nextTierPoints) {
      const tierRange = currentConfig.nextTierPoints - currentConfig.minPoints;
      const currentInTier = currentPoints - currentConfig.minPoints;
      pointsNeeded = Math.max(0, currentConfig.nextTierPoints - currentPoints);
      progressPercent = Math.min(100, Math.round((currentInTier / tierRange) * 100));
    }

    return res.json({
      success: true,
      membership: {
        userId: user.id,
        fullName: user.fullName,
        currentTier: calculatedTier,
        loyaltyPoints: currentPoints,
        currentConfig,
        pointsNeeded,
        progressPercent,
        allTiers: TIERS_CONFIG,
        rewardsCatalog: REWARDS_CATALOG,
        vouchers: user.vouchers || [],
      },
    });
  } catch (err) {
    console.error('[membership:getInfo]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải thông tin hội viên.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC10: Lấy lịch sử giao dịch điểm tích lũy
// ════════════════════════════════════════════════════════════════════════════
router.get('/history', authUser, async (req, res) => {
  try {
    const user = req.user;

    // Nếu chưa có lịch sử, tạo lịch sử mẫu
    if (!user.pointHistory || user.pointHistory.length === 0) {
      user.pointHistory = [
        {
          date: new Date(Date.now() - 30 * 24 * 3600 * 1000),
          description: 'Điểm thưởng chào mừng gia nhập CineMax Privilege',
          pointsChange: +50,
          balanceAfter: 50,
        },
        {
          date: new Date(Date.now() - 14 * 24 * 3600 * 1000),
          description: 'Tích điểm vé xem phim Kung Fu Panda 4',
          pointsChange: +25,
          balanceAfter: 75,
        },
        {
          date: new Date(Date.now() - 7 * 24 * 3600 * 1000),
          description: 'Tích điểm xem phim Godzilla x Kong IMAX 3D',
          pointsChange: +45,
          balanceAfter: 120,
        },
        {
          date: new Date(Date.now() - 2 * 24 * 3600 * 1000),
          description: 'Thưởng nạp hội viên tháng tri ân khách hàng',
          pointsChange: +230,
          balanceAfter: 350,
        },
      ];
      await user.save();
    }

    return res.json({
      success: true,
      pointHistory: user.pointHistory.slice().reverse(), // Mới nhất lên đầu
    });
  } catch (err) {
    console.error('[membership:getHistory]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải lịch sử điểm.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC10: Đổi điểm lấy quà thưởng / Voucher
// ════════════════════════════════════════════════════════════════════════════
router.post('/redeem', authUser, async (req, res) => {
  try {
    const { rewardId } = req.body;
    const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);

    if (!reward) {
      return res.status(404).json({ success: false, message: 'Quà tặng không tồn tại trong danh mục.' });
    }

    const user = req.user;
    if ((user.loyaltyPoints || 0) < reward.pointsCost) {
      return res.status(400).json({
        success: false,
        message: `Bạn không đủ điểm để đổi ${reward.title}. Cần ${reward.pointsCost} điểm, bạn đang có ${user.loyaltyPoints} điểm.`,
      });
    }

    // Trừ điểm
    user.loyaltyPoints -= reward.pointsCost;

    // Sinh mã voucher duy nhất
    const voucherCode = `CNM-VCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiryDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toLocaleDateString('vi-VN');

    const newVoucher = {
      code: voucherCode,
      title: reward.title,
      discount: reward.category,
      pointsCost: reward.pointsCost,
      expiryDate,
      isUsed: false,
      createdAt: new Date(),
    };

    user.vouchers.push(newVoucher);

    // Ghi nhật ký điểm
    user.pointHistory.push({
      date: new Date(),
      description: `Đổi quà [${reward.title}] (-${reward.pointsCost} điểm)`,
      pointsChange: -reward.pointsCost,
      balanceAfter: user.loyaltyPoints,
    });

    await user.save();

    return res.json({
      success: true,
      message: `Đổi quà thành công! Mã ưu đãi của bạn là: ${voucherCode}. Bạn còn ${user.loyaltyPoints} điểm.`,
      newLoyaltyPoints: user.loyaltyPoints,
      voucher: newVoucher,
    });
  } catch (err) {
    console.error('[membership:redeem]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi đổi điểm thưởng.' });
  }
});

module.exports = router;

