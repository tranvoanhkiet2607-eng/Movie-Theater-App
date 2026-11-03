// Anh Kiệt - CE180795
// API Routes: Quản Lý Đặt Vé & Thanh Toán
// UC29: Book Tickets | UC30: View Details | UC32: Calculate Total
// UC33: Make Payment | UC34: Cancel Booking | UC35: Generate E-Ticket | UC36: Manage Bookings

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Showtime = require('../models/Showtime');
const Promotion = require('../models/Promotion');
const User = require('../models/User');

// ════════════════════════════════════════════════════════════════════════════
// GET /api/bookings/showtime/:showtimeId/occupied-seats
// UC29: Lấy danh sách các ghế đã được đặt của một suất chiếu
// ════════════════════════════════════════════════════════════════════════════
router.get('/showtime/:showtimeId/occupied-seats', async (req, res) => {
  try {
    const { showtimeId } = req.params;

    // Tìm tất cả các đơn đặt vé đang có hiệu lực (chưa bị hủy) của suất chiếu này
    const activeBookings = await Booking.find(
      {
        showtimeId,
        status: { $in: ['confirmed', 'completed'] },
      },
      'seats'
    );

    const occupiedSeats = [];
    activeBookings.forEach((b) => {
      if (Array.isArray(b.seats)) {
        occupiedSeats.push(...b.seats);
      }
    });

    return res.json({
      success: true,
      showtimeId,
      occupiedSeats: Array.from(new Set(occupiedSeats)),
    });
  } catch (error) {
    console.error('[GET /api/bookings/showtime/:showtimeId/occupied-seats]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách ghế đã đặt.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/bookings
// UC29: Book Tickets (Tạo đơn & lưu ghế đã chọn)
// UC32: Calculate Total (Tính toán & xác thực tổng tiền)
// UC33: Make Payment (Thanh toán giả lập thành công)
// UC35: Generate E-Ticket (Tạo vé điện tử & mã QR)
// ════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const {
      userId = '',
      customerName,
      customerPhone,
      customerEmail = '',
      showtimeId,
      movieId,
      movieTitle,
      moviePoster = '',
      theaterId,
      theaterName,
      roomName,
      showtimeDate,
      showtimeTime,
      format = '2D Phụ đề',
      seats = [],
      seatDetails = [],
      seatPriceTotal = 0,
      foodItems = [],
      foodPriceTotal = 0,
      promotionCode = '',
      discountAmount = 0,
      totalAmount,
      paymentMethod = 'momo',
    } = req.body;

    // 1. Kiểm tra đầu vào bắt buộc
    if (!customerName || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp họ tên và số điện thoại người nhận vé.',
      });
    }

    if (!showtimeId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn suất chiếu và ít nhất một ghế ngồi.',
      });
    }

    // 2. UC29: Kiểm tra xung đột ghế (Ghế đã bị người khác đặt chưa)
    const existingConflict = await Booking.findOne({
      showtimeId,
      status: { $in: ['confirmed', 'completed'] },
      seats: { $in: seats },
    });

    if (existingConflict) {
      const conflictingSeats = seats.filter((s) => existingConflict.seats.includes(s));
      return res.status(409).json({
        success: false,
        message: `Rất tiếc, ghế [${conflictingSeats.join(', ')}] vừa có khách khác đặt. Vui lòng chọn ghế khác!`,
      });
    }

    // 3. UC32: Kiểm tra và xác nhận lại tổng tiền
    const expectedSubtotal = Number(seatPriceTotal || 0) + Number(foodPriceTotal || 0);
    const expectedTotal = Math.max(0, expectedSubtotal - Number(discountAmount || 0));

    // 4. Sinh mã đặt vé, mã vạch và dữ liệu QR (UC35)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timestampStr = Date.now().toString().slice(-4);
    const bookingCode = `CNX-${timestampStr}-${randomSuffix}`;
    const barcode = `893${Date.now().toString().slice(-7)}${randomSuffix}`;

    const qrPayload = JSON.stringify({
      code: bookingCode,
      movie: movieTitle,
      room: roomName,
      time: `${showtimeTime} | ${showtimeDate}`,
      seats: seats.join(','),
      theater: theaterName,
      total: expectedTotal,
    });

    // 5. Tạo bản ghi đơn vé mới
    const newBooking = new Booking({
      bookingCode,
      userId,
      customerName,
      customerPhone,
      customerEmail,
      showtimeId,
      movieId,
      movieTitle,
      moviePoster,
      theaterId,
      theaterName,
      roomName,
      showtimeDate,
      showtimeTime,
      format,
      seats,
      seatDetails,
      seatPriceTotal,
      foodItems,
      foodPriceTotal,
      promotionCode: promotionCode.toUpperCase(),
      discountAmount,
      totalAmount: expectedTotal,
      paymentMethod,
      paymentStatus: 'paid', // UC33: Giả lập thanh toán tức thì thành công
      status: 'confirmed',
      barcode,
      qrCodeData: qrPayload,
    });

    await newBooking.save();

    // 6. Cập nhật lại số ghế trống của Showtime (nếu tìm thấy)
    try {
      const showtimeDoc = await Showtime.findOne({
        $or: [{ code: showtimeId }, { _id: showtimeId }],
      });
      if (showtimeDoc) {
        showtimeDoc.availableSeats = Math.max(0, showtimeDoc.availableSeats - seats.length);
        if (showtimeDoc.availableSeats === 0) {
          showtimeDoc.status = 'sold_out';
        } else if (showtimeDoc.availableSeats <= 10) {
          showtimeDoc.status = 'almost_full';
        }
        await showtimeDoc.save();
      }
    } catch (e) {
      console.warn('Cập nhật số ghế trống showtime:', e.message);
    }

    // 7. Cập nhật lượt sử dụng mã khuyến mãi (nếu có)
    if (promotionCode) {
      await Promotion.updateOne(
        { code: promotionCode.toUpperCase() },
        { $inc: { usedCount: 1 } }
      ).catch(() => {});
    }

    // 8. Tích điểm thành viên nếu user đã đăng nhập
    if (userId) {
      const earnedPoints = Math.floor(expectedTotal / 10000); // 10.000đ = 1 điểm
      await User.findByIdAndUpdate(userId, {
        $inc: { loyaltyPoints: earnedPoints },
      }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Đặt vé và thanh toán thành công!',
      booking: newBooking,
    });
  } catch (error) {
    console.error('[POST /api/bookings]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tạo đơn đặt vé. Vui lòng thử lại.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/bookings/my-tickets
// UC30: Lấy danh sách vé đã đặt của khách hàng hiện tại
// ════════════════════════════════════════════════════════════════════════════
router.get('/my-tickets', async (req, res) => {
  try {
    const { userId, phone } = req.query;

    const filter = {};
    if (userId && phone) {
      filter.$or = [{ userId }, { customerPhone: phone }];
    } else if (userId) {
      filter.userId = userId;
    } else if (phone) {
      filter.customerPhone = phone;
    }

    const tickets = await Booking.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('[GET /api/bookings/my-tickets]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách vé.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/bookings/:id
// UC30: Hiển thị chi tiết đơn đặt vé (mã vé, ghế, suất chiếu, bắp nước, tổng tiền)
// ════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({
      $or: [{ bookingCode: id }, { _id: id }],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy đơn đặt vé với mã "${id}".`,
      });
    }

    return res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('[GET /api/bookings/:id]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xem chi tiết đơn vé.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/bookings/:id/cancel
// UC34: Hủy đặt vé hợp lệ và cập nhật trạng thái ghế theo quy định
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Khách hàng yêu cầu hủy vé' } = req.body;

    const booking = await Booking.findOne({
      $or: [{ bookingCode: id }, { _id: id }],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn vé cần hủy.',
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Đơn vé này đã được hủy trước đó.',
      });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Vé đã được sử dụng (check-in), không thể hủy.',
      });
    }

    // ─── Quy định kiểm tra thời gian hủy vé ─────────────────────────────────────
    // Quy định rạp chiếu: Chỉ được hủy vé trước giờ chiếu ít nhất 60 phút
    const now = new Date();
    let isAllowCancel = true;
    let timeDiffMinutes = 999;

    // Cố gắng parse ngày giờ suất chiếu để kiểm tra
    try {
      if (booking.showtimeTime && booking.showtimeDate) {
        // Nếu date là dạng YYYY-MM-DD hoặc DD/MM/YYYY
        let datePart = booking.showtimeDate.trim();
        if (datePart.includes('/')) {
          const [d, m, y] = datePart.split('/');
          datePart = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        } else if (datePart.toLowerCase().includes('hôm nay')) {
          datePart = now.toISOString().split('T')[0];
        }

        const showtimeDateTimeStr = `${datePart}T${booking.showtimeTime}:00`;
        const showtimeDateObj = new Date(showtimeDateTimeStr);

        if (!isNaN(showtimeDateObj.getTime())) {
          timeDiffMinutes = Math.round((showtimeDateObj.getTime() - now.getTime()) / (1000 * 60));
          if (timeDiffMinutes < 60) {
            isAllowCancel = false;
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi parse thời gian hủy vé:', e.message);
    }

    if (!isAllowCancel) {
      return res.status(400).json({
        success: false,
        message: `Theo quy định của rạp, vé chỉ được hủy trước giờ chiếu tối thiểu 60 phút. Suất chiếu này chỉ còn khoảng ${Math.max(0, timeDiffMinutes)} phút nữa sẽ bắt đầu.`,
      });
    }

    // Cập nhật trạng thái đơn vé sang 'cancelled'
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    booking.cancelledReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    // Giải phóng ghế trong Showtime (tăng lại availableSeats)
    try {
      const showtimeDoc = await Showtime.findOne({
        $or: [{ code: booking.showtimeId }, { _id: booking.showtimeId }],
      });
      if (showtimeDoc) {
        showtimeDoc.availableSeats = Math.min(
          showtimeDoc.totalSeats,
          showtimeDoc.availableSeats + booking.seats.length
        );
        if (showtimeDoc.availableSeats > 0 && showtimeDoc.status === 'sold_out') {
          showtimeDoc.status = 'available';
        }
        await showtimeDoc.save();
      }
    } catch (e) {
      console.warn('Giải phóng ghế suất chiếu:', e.message);
    }

    return res.json({
      success: true,
      message: `Hủy vé ${booking.bookingCode} thành công! Ghế [${booking.seats.join(', ')}] đã được giải phóng.`,
      booking,
    });
  } catch (error) {
    console.error('[PUT /api/bookings/:id/cancel]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xử lý hủy vé.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/bookings
// UC36: Manage Bookings — Quản trị viên tìm kiếm và lọc danh sách đơn đặt vé
// ════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      date = 'all',
      theaterId = 'all',
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    // 1. Lọc theo trạng thái
    if (status && status !== 'all') {
      query.status = status;
    }

    // 2. Lọc theo rạp
    if (theaterId && theaterId !== 'all') {
      query.theaterId = theaterId;
    }

    // 3. Tìm kiếm theo mã vé, tên khách, số điện thoại, tên phim
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { bookingCode: { $regex: s, $options: 'i' } },
        { customerName: { $regex: s, $options: 'i' } },
        { customerPhone: { $regex: s, $options: 'i' } },
        { movieTitle: { $regex: s, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Booking.countDocuments(query),
    ]);

    return res.json({
      success: true,
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[GET /api/bookings]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tra cứu danh sách đơn vé quản trị.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/bookings/:id/status
// UC36: Quản trị viên cập nhật trạng thái đơn vé (Soát vé / Hoàn tất / Hủy)
// ════════════════════════════════════════════════════════════════════════════
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancelledReason } = req.body;

    if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái đơn vé không hợp lệ.',
      });
    }

    const booking = await Booking.findOne({
      $or: [{ bookingCode: id }, { _id: id }],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn vé.',
      });
    }

    const previousStatus = booking.status;
    booking.status = status;

    if (status === 'cancelled') {
      booking.paymentStatus = 'refunded';
      booking.cancelledReason = cancelledReason || 'Quản trị viên hủy đơn';
      booking.cancelledAt = new Date();

      // Giải phóng ghế
      if (previousStatus !== 'cancelled') {
        const showtimeDoc = await Showtime.findOne({
          $or: [{ code: booking.showtimeId }, { _id: booking.showtimeId }],
        });
        if (showtimeDoc) {
          showtimeDoc.availableSeats = Math.min(
            showtimeDoc.totalSeats,
            showtimeDoc.availableSeats + booking.seats.length
          );
          await showtimeDoc.save();
        }
      }
    }

    await booking.save();

    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn vé sang "${status}".`,
      booking,
    });
  } catch (error) {
    console.error('[PUT /api/bookings/:id/status]', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái đơn vé.',
    });
  }
});

module.exports = router;

