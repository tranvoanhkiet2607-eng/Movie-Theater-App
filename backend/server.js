const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

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
      console.log('🌱 Đã seed 2 tài khoản mẫu vào MongoDB');
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
