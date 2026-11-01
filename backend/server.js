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
const showtimeRoutes = require('./routes/showtimes');
const movieRoutes = require('./routes/movies');
const { seedShowtimesData } = require('./seed/seedShowtimes');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/showtimes', showtimeRoutes);
app.use('/api/movies', movieRoutes);

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

mongoose
  .connect(MONGODB_URI, { dbName: 'movie_theater' })
  .then(async () => {
    console.log(`✅ Kết nối MongoDB Atlas thành công! (Database: ${mongoose.connection.name})`);

    // Seed dữ liệu mẫu nếu chưa có user nào
    const User = require('./models/User');
    const count = await User.countDocuments();
    if (count === 0) {
      await User.create([
        {
          fullName: 'Nguyễn Văn A',
          email: 'customer@cinema.com',
          phone: '0901234567',
          password: 'password123',
          role: 'customer',
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
          membershipTier: 'VIP',
          loyaltyPoints: 1250,
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        },
      ]);
      console.log('🌱 Đã seed 2 tài khoản khách hàng mẫu vào MongoDB');
    }

    // Đảm bảo luôn có tài khoản Admin trên MongoDB Atlas
    const adminExists = await User.findOne({ email: 'admin@cinema.com' });
    if (!adminExists) {
      await User.create({
        fullName: 'Quản Trị Viên CineMax (Admin)',
        email: 'admin@cinema.com',
        phone: '0909999999',
        password: 'password123',
        role: 'admin',
        membershipTier: 'VIP',
        loyaltyPoints: 9999,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      });
    }

    // Tự động khởi tạo dữ liệu Phim, Cụm rạp và Lịch chiếu nếu chưa có
    await seedShowtimesData();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0');
  })
  .catch((err) => {
    console.error('❌ Kết nối MongoDB thất bại:', err.message);
    process.exit(1);
  });
