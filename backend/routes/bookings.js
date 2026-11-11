// Nguyễn Minh Quân - CE180048
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Showtime = require('../models/Showtime');
const Order = require('../models/Order');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');

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

// ════════════════════════════════════════════════════════════════════════════
// UC09: Lấy danh sách Vé của tôi (Phân tách: Vé sắp sử dụng & Lịch sử đặt vé)
// ════════════════════════════════════════════════════════════════════════════
router.get('/my-bookings', authUser, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const upcoming = bookings.filter((b) => b.status === 'upcoming');
    const past = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled');

    return res.json({
      success: true,
      upcoming: upcoming.map((b) => b.toJSON()),
      past: past.map((b) => b.toJSON()),
      totalBookings: bookings.length,
    });
  } catch (err) {
    console.error('[bookings:getMyBookings]', err);
    return res.status(500).json({ success: false, message: 'Lỗi tải lịch sử vé xem phim.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC09: Hủy vé sắp sử dụng
// ════════════════════════════════════════════════════════════════════════════
router.post('/:id/cancel', authUser, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findOne({ _id: id, userId: req.user._id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vé xem phim.' });
    }

    if (booking.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy vé ở trạng thái Sắp sử dụng trước giờ chiếu.',
      });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // 1. Giải phóng ghế trong suất chiếu tương ứng để khách hàng khác có thể đặt
    if (booking.seats && booking.seats.length > 0) {
      try {
        let st = null;
        if (booking.showtimeId) {
          st = await Showtime.findOne({ code: booking.showtimeId });
          if (!st && booking.showtimeId.match(/^[0-9a-fA-F]{24}$/)) {
            st = await Showtime.findById(booking.showtimeId);
          }
        }
        if (!st) {
          const movie = await Movie.findOne({ title: booking.movieTitle });
          const theater = await Theater.findOne({ name: booking.cinemaName });
          if (movie && theater) {
            st = await Showtime.findOne({
              movieId: movie.code,
              theaterId: theater.code,
              room: booking.hallName,
            });
          }
        }

        if (st && st.bookedSeats) {
          st.bookedSeats = st.bookedSeats.filter((sCode) => !booking.seats.includes(sCode));
          const totalSeats = st.totalSeats || 66;
          st.availableSeats = Math.max(0, totalSeats - st.bookedSeats.length);

          if (st.availableSeats === 0) st.status = 'sold_out';
          else if (st.availableSeats <= 15) st.status = 'almost_full';
          else if (st.availableSeats <= totalSeats * 0.5) st.status = 'filling_fast';
          else st.status = 'available';

          await st.save();
        }
      } catch (stErr) {
        console.log('[Release Seats Error on Cancel]', stErr.message);
      }
    }

    // 2. Cập nhật Order tương ứng nếu có
    try {
      const order = await Order.findOne({ orderCode: booking.bookingCode });
      if (order) {
        order.orderStatus = 'cancelled';
        order.paymentStatus = 'refunded';
        await order.save();
      }
    } catch (orderErr) {
      console.log('[Update Order on Cancel]', orderErr.message);
    }

    // 3. Khấu trừ điểm thưởng tích lũy của vé đã hủy
    try {
      const deductedPoints = Math.round((booking.totalAmount * 0.08) / 1000);
      if (deductedPoints > 0) {
        req.user.loyaltyPoints = Math.max(0, (req.user.loyaltyPoints || 0) - deductedPoints);
        if (!req.user.pointHistory) req.user.pointHistory = [];
        req.user.pointHistory.push({
          date: new Date(),
          description: `Thu hồi điểm thưởng do hủy vé ${booking.bookingCode}`,
          pointsChange: -deductedPoints,
          balanceAfter: req.user.loyaltyPoints,
        });
        await req.user.save();
      }
    } catch (ptsErr) {
      console.log('[Deduct Loyalty Points on Cancel]', ptsErr.message);
    }

    return res.json({
      success: true,
      message: `Đã hủy vé ${booking.bookingCode} thành công. Tiền hoàn đã được gửi về phương thức thanh toán ban đầu.`,
      booking: booking.toJSON(),
    });
  } catch (err) {
    console.error('[bookings:cancel]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi hủy vé.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// UC09: Tạo vé mới (Mô phỏng đặt vé thành công)
// ════════════════════════════════════════════════════════════════════════════
router.post('/', authUser, async (req, res) => {
  try {
    const { movieTitle, moviePoster, cinemaName, hallName, showtime, format, seats, seatType, combos, totalAmount, paymentMethod } = req.body;

    if (!movieTitle || !cinemaName || !hallName || !seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin: phim, cụm rạp, phòng chiếu và danh sách ghế đặt.',
      });
    }

    const bookingCode = `CNM-${Math.floor(100000 + Math.random() * 900000)}`;

    const newBooking = await Booking.create({
      userId: req.user._id,
      bookingCode,
      movieTitle: String(movieTitle).trim(),
      moviePoster: moviePoster || '',
      cinemaName: String(cinemaName).trim(),
      hallName: String(hallName).trim(),
      showtime: showtime ? new Date(showtime) : new Date(),
      format: format || '2D Phụ đề',
      seats,
      seatType: seatType || 'standard',
      combos: combos || '',
      totalAmount: Number(totalAmount) || 0,
      paymentMethod: paymentMethod || 'Thẻ ATM / QR',
      paymentStatus: 'paid',
      status: 'upcoming',
      qrCodeData: `CINEMAX-TICKET-${bookingCode}-${req.user.id}`,
    });

    // Cộng điểm thưởng hội viên (tính 5-10% số tiền / 1000đ)
    const earnedPoints = Math.round((newBooking.totalAmount * 0.08) / 1000);
    req.user.loyaltyPoints = (req.user.loyaltyPoints || 0) + earnedPoints;
    req.user.pointHistory.push({
      date: new Date(),
      description: `Tích điểm từ vé ${newBooking.bookingCode} (${newBooking.movieTitle})`,
      pointsChange: earnedPoints,
      balanceAfter: req.user.loyaltyPoints,
    });
    await req.user.save();

    return res.status(201).json({
      success: true,
      message: `Đặt vé thành công! Bạn nhận được +${earnedPoints} điểm thưởng hội viên.`,
      booking: newBooking.toJSON(),
      loyaltyPoints: req.user.loyaltyPoints,
    });
  } catch (err) {
    console.error('[bookings:create]', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi đặt vé xem phim.' });
  }
});

module.exports = router;

