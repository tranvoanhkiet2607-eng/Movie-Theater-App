// UC38: Order Food & Drinks (Food Ordering)
// UC44: Manage Food Orders (Food Ordering Administration)
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Promotion = require('../models/Promotion');
const Notification = require('../models/Notification');
const Showtime = require('../models/Showtime');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════
// POST /api/orders  (UC38: Đặt vé kèm đồ ăn thức uống)
// ════════════════════════════════════════════════════════════
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      user,
      showtimeId,
      movie,
      theater,
      tickets,
      foods,
      promotionCode,
      paymentMethod,
      notes,
    } = req.body;

    if (!tickets || tickets.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 ghế xem phim.' });
    }

    // Tính tổng tiền vé
    const subtotalTickets = (tickets || []).reduce(
      (sum, t) => sum + (Number(t.price) || 0),
      0
    );

    // Tính tổng tiền đồ ăn
    const subtotalFoods = (foods || []).reduce(
      (sum, f) => sum + (Number(f.price) * Number(f.quantity) || 0),
      0
    );

    const subtotal = subtotalTickets + subtotalFoods;
    let discountAmount = 0;
    let appliedPromo = null;

    // Áp dụng khuyến mãi nếu có mã
    if (promotionCode && promotionCode.trim()) {
      const code = promotionCode.trim().toUpperCase();
      const promo = await Promotion.findOne({ code, isActive: true });
      if (promo) {
        const now = new Date();
        const isValidDate = (!promo.startDate || promo.startDate <= now) &&
                            (!promo.endDate || promo.endDate >= now);
        const isValidMin = !promo.minOrderValue || subtotal >= promo.minOrderValue;

        if (isValidDate && isValidMin) {
          if (promo.discountType === 'percentage') {
            discountAmount = Math.round((subtotal * promo.discountValue) / 100);
            if (promo.maxDiscount > 0 && discountAmount > promo.maxDiscount) {
              discountAmount = promo.maxDiscount;
            }
          } else {
            discountAmount = promo.discountValue;
          }
          if (discountAmount > subtotal) discountAmount = subtotal;

          // Tăng lượt sử dụng
          promo.usedCount = (promo.usedCount || 0) + 1;
          await promo.save();
          appliedPromo = promo;
        }
      }
    }

    const totalPrice = Math.max(0, subtotal - discountAmount);

    // Sinh mã đơn hàng ngẫu nhiên: ORD-YYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `ORD-${dateStr}-${randPart}`;

    // Giảm số ghế khả dụng của suất chiếu nếu có showtimeId
    if (showtimeId) {
      try {
        const st = await Showtime.findById(showtimeId);
        if (st && st.availableSeats > 0) {
          const bookedCount = tickets.length;
          st.availableSeats = Math.max(0, st.availableSeats - bookedCount);
          if (st.availableSeats === 0) st.status = 'sold_out';
          else if (st.availableSeats < 20) st.status = 'filling_fast';
          await st.save();
        }
      } catch (stErr) {
        console.log('[Update Showtime Seats Note]', stErr.message);
      }
    }

    const newOrder = await Order.create({
      orderCode,
      user: {
        id: (req.user && req.user.id) || user?.id || user?.userId || 'guest',
        fullName: (req.user && req.user.fullName) || user?.fullName || user?.name || 'Khách hàng',
        email: (req.user && req.user.email) || user?.email || '',
        phone: (req.user && req.user.phone) || user?.phone || '',
      },
      movie: {
        id: movie?.id || '',
        title: movie?.title || 'Phim rạp',
        poster: movie?.poster || '',
        ageRating: movie?.ageRating || 'T13',
      },
      theater: {
        id: theater?.id || '',
        name: theater?.name || 'CineMax Theater',
        room: theater?.room || 'Rạp 01',
        showtimeDate: theater?.showtimeDate || 'Hôm nay',
        showtimeTime: theater?.showtimeTime || '20:00',
        format: theater?.format || '2D Phụ đề',
      },
      tickets: tickets || [],
      foods: (foods || []).map((f) => ({
        foodId: f.foodId || f.id || '',
        name: f.name,
        category: f.category || 'food',
        price: Number(f.price),
        quantity: Number(f.quantity),
        image: f.image || '',
      })),
      subtotalTickets,
      subtotalFoods,
      promotionCode: appliedPromo ? appliedPromo.code : '',
      discountAmount,
      totalPrice,
      paymentMethod: paymentMethod || 'MoMo',
      paymentStatus: 'paid',
      orderStatus: foods && foods.length > 0 ? 'preparing' : 'completed',
      notes: notes || '',
    });

    // Tự động tạo thông báo gửi cho khách hàng (UC43)
    try {
      const foodSummary = foods && foods.length > 0
        ? ` + ${foods.length} món bắp nước (${foods.map((f) => `${f.name} x${f.quantity}`).join(', ')})`
        : '';

      await Notification.create({
        title: `🎬 Đặt vé thành công: #${orderCode}`,
        message: `Chúc mừng bạn đã đặt thành công ${tickets.length} vé xem phim "${movie?.title || 'Phim'}" tại ${theater?.name || 'CineMax'}${foodSummary}. Vui lòng kiểm tra mã QR đơn hàng tại quầy để nhận vé và đồ ăn.`,
        type: 'order',
        targetUser: user?.id || 'all',
      });
    } catch (notifErr) {
      console.log('[Create Order Notification Error]', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Đặt vé và đồ ăn thành công!',
      order: newOrder.toJSON(),
    });
  } catch (err) {
    console.error('[POST /api/orders]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo đơn đặt vé.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/orders  (Danh sách đơn hàng của user hoặc tất cả)
// ════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { userId, status, limit = 50 } = req.query;
    const query = {};

    if (userId && userId !== 'all') {
      query['user.id'] = userId;
    }

    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    return res.json({
      success: true,
      total: orders.length,
      orders: orders.map((o) => o.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/orders]', err);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/orders/food-orders  (UC44: Danh sách đơn đồ ăn quản lý quầy)
// ════════════════════════════════════════════════════════════
router.get('/food-orders', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {
      'foods.0': { $exists: true }, // Chỉ lấy các đơn có chứa đồ ăn thức uống
    };

    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderCode: searchRegex },
        { 'user.fullName': searchRegex },
        { 'user.phone': searchRegex },
        { 'movie.title': searchRegex },
      ];
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: orders.length,
      orders: orders.map((o) => o.toJSON()),
    });
  } catch (err) {
    console.error('[GET /api/orders/food-orders]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tải danh sách đơn đồ ăn.' });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/orders/:id  (Xem chi tiết đơn hàng)
// ════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }
    return res.json({ success: true, order: order.toJSON() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đơn hàng.' });
  }
});

// ════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/status  (UC44: Cập nhật trạng thái đơn hàng F&B)
// ════════════════════════════════════════════════════════════
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    const statusMap = {
      pending: 'Chờ tiếp nhận',
      preparing: 'Đang chuẩn bị đồ ăn',
      ready: 'Đã chuẩn bị xong - Mời khách nhận',
      completed: 'Đã hoàn tất',
      cancelled: 'Đã hủy đơn',
    };

    // Tạo thông báo cho khách khi đơn hàng đã sẵn sàng
    if (orderStatus === 'ready' && order.user?.id) {
      await Notification.create({
        title: `🍿 Đồ ăn của bạn đã sẵn sàng! #${order.orderCode}`,
        message: `Đơn đồ ăn và thức uống #${order.orderCode} của bạn đã sẵn sàng tại quầy CineMax. Xin mời bạn đến nhận trước giờ chiếu phim!`,
        type: 'order',
        targetUser: order.user.id,
      });
    }

    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn: ${statusMap[orderStatus]}`,
      order: order.toJSON(),
    });
  } catch (err) {
    console.error('[PATCH /api/orders/:id/status]', err);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đơn hàng.' });
  }
});

module.exports = router;

