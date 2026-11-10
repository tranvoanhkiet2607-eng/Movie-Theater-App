const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
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

// ════════════════════════════════════════════════════════════════════════════
// UC09: Lấy danh sách Vé của tôi (Phân tách: Vé sắp sử dụng & Lịch sử đặt vé)
// ════════════════════════════════════════════════════════════════════════════
router.get('/my-bookings', authUser, async (req, res) => {
  try {
    let bookings = await Booking.find({ userId: req.user._id }).sort({ showtime: -1 });

    // Nếu user chưa có vé nào, tự động seed vé mẫu sinh động
    if (bookings.length === 0) {
      const now = new Date();
      const sampleUpcoming = await Booking.create({
        userId: req.user._id,
        bookingCode: `CNM-${Math.floor(100000 + Math.random() * 900000)}`,
        movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
        moviePoster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
        cinemaName: 'CineMax Vincom Đồng Khởi',
        hallName: 'Rạp 03 (IMAX Laser)',
        showtime: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 4 tiếng nữa
        format: 'IMAX 3D Laser',
        seats: ['F08', 'F09'],
        seatType: 'VIP',
        combos: '1 Bắp phô mai lớn + 2 Coca Cola Zero',
        totalAmount: 380000,
        paymentMethod: 'Ví MoMo',
        paymentStatus: 'paid',
        status: 'upcoming',
        qrCodeData: `CINEMAX-TICKET-F08F09-${req.user.id}`,
      });

      const sampleCompleted = await Booking.create({
        userId: req.user._id,
        bookingCode: `CNM-${Math.floor(100000 + Math.random() * 900000)}`,
        movieTitle: 'Godzilla x Kong: Đế Chế Mới',
        moviePoster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
        cinemaName: 'CineMax Landmark 81',
        hallName: 'Rạp 01',
        showtime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 ngày trước
        format: '2D Phụ đề',
        seats: ['G12', 'G13'],
        seatType: 'Standard',
        combos: '1 Bắp bơ ngọt + 1 Sprite',
        totalAmount: 220000,
        paymentMethod: 'Thẻ tín dụng Visa',
        paymentStatus: 'paid',
        status: 'completed',
        qrCodeData: `CINEMAX-TICKET-G12G13-${req.user.id}`,
      });

      const sampleCancelled = await Booking.create({
        userId: req.user._id,
        bookingCode: `CNM-${Math.floor(100000 + Math.random() * 900000)}`,
        movieTitle: 'Kung Fu Panda 4',
        moviePoster: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500',
        cinemaName: 'CineMax Crescent Mall',
        hallName: 'Rạp 02',
        showtime: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        format: '2D Lồng tiếng',
        seats: ['E05'],
        seatType: 'Standard',
        combos: '',
        totalAmount: 95000,
        paymentMethod: 'ZaloPay',
        paymentStatus: 'refunded',
        status: 'cancelled',
        qrCodeData: `CINEMAX-TICKET-E05-${req.user.id}`,
      });

      bookings = [sampleUpcoming, sampleCompleted, sampleCancelled];
    }

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

    const bookingCode = `CNM-${Math.floor(100000 + Math.random() * 900000)}`;

    const newBooking = await Booking.create({
      userId: req.user._id,
      bookingCode,
      movieTitle: movieTitle || 'Dune: Hành Tinh Cát - Phần 2',
      moviePoster: moviePoster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
      cinemaName: cinemaName || 'CineMax Vincom Đồng Khởi',
      hallName: hallName || 'Rạp 03 (IMAX)',
      showtime: showtime ? new Date(showtime) : new Date(Date.now() + 2 * 3600 * 1000),
      format: format || '2D Phụ đề',
      seats: seats && seats.length > 0 ? seats : ['F08', 'F09'],
      seatType: seatType || 'VIP',
      combos: combos || '1 Bắp + 2 Nước ngọt',
      totalAmount: totalAmount || 260000,
      paymentMethod: paymentMethod || 'Ví MoMo',
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
