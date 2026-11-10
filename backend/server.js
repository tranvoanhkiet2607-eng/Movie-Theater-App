const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookingRoutes = require('./routes/bookings');
const membershipRoutes = require('./routes/membership');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/membership', membershipRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ─── Connect MongoDB ─────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || MONGODB_URI.includes('<username>')) {
  console.error('\n❌ LỖI: Bạn chưa cấu hình MONGODB_URI trong file .env');
  console.error('📖 Xem hướng dẫn: backend/README.md\n');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Kết nối MongoDB Atlas thành công!');

    // Seed dữ liệu mẫu nếu chưa có user nào hoặc chưa có admin
    const User = require('./models/User');
    const adminExists = await User.findOne({ email: 'admin@cinema.com' });
    if (!adminExists) {
      await User.create({
        fullName: 'Quản Trị Viên Hệ Thống',
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
      console.log('🌱 Đã seed tài khoản khách hàng mẫu vào MongoDB');
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Backend đang chạy tại http://localhost:${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error('❌ Kết nối MongoDB thất bại:', err.message);
    process.exit(1);
  });
