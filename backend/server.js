const path = require('path');
const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Khắc phục lỗi "querySrv ECONNREFUSED" của Node.js trên Windows khi phân giải SRV record của MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

// Luôn đọc đúng file .env nằm trong thư mục backend dù chạy từ thư mục gốc hay backend
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings');
const membershipRoutes = require('./routes/membership');
const showtimeRoutes = require('./routes/showtimes');
const movieRoutes = require('./routes/movies');
const foodRoutes = require('./routes/food');
const promotionRoutes = require('./routes/promotions');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const seatRoutes = require('./routes/seats');
const pricingRoutes = require('./routes/pricing');
const genreRoutes = require('./routes/genres');
const theaterRoutes = require('./routes/theaters');
const { seedShowtimesData } = require('./seed/seedShowtimes');
const { seedNewFeaturesData } = require('./seed/seedNewFeatures');
const { seedSeatsData } = require('./seed/seedSeats');
const { ensureDefaultPricingRules } = require('./seed/seedPricingRules');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/theaters', theaterRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    dbName: mongoose.connection.name,
    timestamp: new Date().toISOString(),
  });
});

// ─── Helper: Tự động mã hóa ký tự '@' trong password của MONGODB_URI ─────────
function normalizeMongoUri(uri) {
  if (!uri) return uri;
  const trimmed = uri.trim();
  const match = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.+)$/);
  if (!match) return trimmed;

  const [, protocol, rest] = match;
  const slashIndex = rest.indexOf('/');
  const authority = slashIndex !== -1 ? rest.slice(0, slashIndex) : rest;
  const pathAndQuery = slashIndex !== -1 ? rest.slice(slashIndex) : '/';
  const lastAtIndex = authority.lastIndexOf('@');
  if (lastAtIndex === -1) return trimmed;

  const userInfo = authority.slice(0, lastAtIndex);
  const host = authority.slice(lastAtIndex + 1);
  const colonIndex = userInfo.indexOf(':');
  if (colonIndex === -1) return trimmed;

  const username = userInfo.slice(0, colonIndex);
  const rawPassword = userInfo.slice(colonIndex + 1);
  const decodedPassword = decodeURIComponent(rawPassword);
  const safePassword = encodeURIComponent(decodedPassword);
  return `${protocol}${username}:${safePassword}@${host}${pathAndQuery}`;
}

// ─── Connect MongoDB ─────────────────────────────────────────────────────────
const MONGODB_URI = normalizeMongoUri(process.env.MONGODB_URI);

if (!MONGODB_URI || MONGODB_URI.includes('<username>')) {
  console.error('\n❌ LỖI: Bạn chưa cấu hình MONGODB_URI trong file backend/.env');
  process.exit(1);
}

// ─── Khởi động Express Server ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend CineMax đang chạy tại http://localhost:${PORT}`);
  console.log(`🔗 Kiểm tra trạng thái: http://localhost:${PORT}/health`);
});

// ─── Kết nối MongoDB Atlas (với cơ chế tự động thử lại) ─────────────────────
let isSeeded = false;

async function seedInitialData() {
  if (isSeeded) return;
  try {
    const User = require('./models/User');

    const adminExists = await User.findOne({ email: 'admin@cinema.com' });
    if (!adminExists) {
      await User.create({
        fullName: 'Quản Trị Viên CineMax (Admin)',
        email: 'admin@cinema.com',
        phone: '0912345678',
        password: 'password123',
        role: 'admin',
        isActive: true,
        membershipTier: 'VIP',
        loyaltyPoints: 9999,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      });
      console.log('🌱 Đã seed tài khoản Quản trị viên (admin@cinema.com)');
    }

    const staffExists = await User.findOne({ email: 'staff@cinema.com' });
    if (!staffExists) {
      await User.create({
        fullName: 'Lê Hoàng Nhân Viên',
        email: 'staff@cinema.com',
        phone: '0933445566',
        password: 'password123',
        role: 'staff',
        isActive: true,
        membershipTier: 'Silver',
        loyaltyPoints: 150,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      });
      console.log('🌱 Đã seed tài khoản Nhân viên (staff@cinema.com)');
    }

    const count = await User.countDocuments();
    if (count <= 2) {
      await User.create([
        {
          fullName: 'Nguyễn Văn A',
          email: 'customer@cinema.com',
          phone: '0901234567',
          password: 'password123',
          role: 'customer',
          isActive: true,
          membershipTier: 'Gold',
          loyaltyPoints: 350,
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        },
        {
          fullName: 'Trần Thị Bích Ngọc',
          email: 'vip@cinema.com',
          phone: '0987654321',
          password: 'password123',
          role: 'customer',
          isActive: true,
          membershipTier: 'VIP',
          loyaltyPoints: 1250,
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        },
      ]);
      console.log('🌱 Đã seed 2 tài khoản khách hàng mẫu vào MongoDB');
    }

    // Tự động khởi tạo dữ liệu Phim, Cụm rạp và Lịch chiếu nếu chưa có
    await seedShowtimesData();
    // Tự động khởi tạo dữ liệu cho Food, Promotions, Reviews, Notifications, Orders
    await seedNewFeaturesData();
    // Tự động khởi tạo dữ liệu Ghế ngồi (UC23)
    await seedSeatsData();
    // Tự động khởi tạo dữ liệu Quy tắc giá vé (UC28)
    await ensureDefaultPricingRules();
    isSeeded = true;
  } catch (seedErr) {
    console.error('⚠️ Lỗi khi seed dữ liệu ban đầu:', seedErr.message);
  }
}

async function connectToMongo() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'movie_theater',
      serverSelectionTimeoutMS: 7000,
    });
    console.log(`✅ Kết nối MongoDB Atlas thành công! (Database: ${mongoose.connection.name})`);
    await seedInitialData();
  } catch (err) {
    console.error('\n⚠️ CHƯA THỂ KẾT NỐI MONGODB ATLAS:');
    console.error('Chi tiết lỗi:', err.message);
    console.log('\n📌 NGUYÊN NHÂN: Địa chỉ IP mạng hiện tại của bạn chưa được cấp phép (whitelist) trên MongoDB Atlas.');
    console.log('👉 HƯỚNG DẪN CẤP PHÉP IP TRÊN MONGODB ATLAS (Mất 30 giây):');
    console.log('   1. Đăng nhập vào trang quản trị: https://cloud.mongodb.com');
    console.log('   2. Nhìn menu bên trái mục "Security" ➔ bấm chọn "Network Access".');
    console.log('   3. Nhấn nút xanh "+ ADD IP ADDRESS".');
    console.log('   4. Chọn "ALLOW ACCESS FROM ANYWHERE" (IP: 0.0.0.0/0) ➔ bấm "Confirm".');
    console.log('   5. Đợi 1-2 phút trạng thái chuyển sang Active.\n');
    console.log('🔄 Đang tự động thử kết nối lại sau 15 giây...\n');

    setTimeout(connectToMongo, 15000);
  }
}

connectToMongo();
