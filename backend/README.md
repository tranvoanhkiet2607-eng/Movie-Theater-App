# 🗄️ Backend API — Movie Theater App

## Stack
- **Node.js** + **Express** — REST API
- **MongoDB Atlas** — Cloud database (miễn phí)
- **Mongoose** — ODM
- **bcryptjs** — Hash password
- **JWT** — Xác thực token

---

## ⚡ Bước 1: Tạo MongoDB Atlas (miễn phí)

1. Vào https://cloud.mongodb.com và đăng ký tài khoản
2. Tạo **Free Cluster** (chọn M0 Shared)
3. Tạo **Database User**:
   - Vào `Database Access` → `Add New Database User`
   - Username: `movie_admin` | Password: (đặt mật khẩu mạnh, ghi lại)
4. Cho phép IP kết nối:
   - Vào `Network Access` → `Add IP Address` → chọn **Allow Access from Anywhere** (0.0.0.0/0)
5. Lấy **Connection String**:
   - Vào `Clusters` → `Connect` → `Drivers`
   - Chọn Node.js, copy URI dạng: `mongodb+srv://movie_admin:<password>@cluster0.xxxxx.mongodb.net/`

---

## ⚡ Bước 2: Cấu hình `.env`

Mở file `backend/.env` và điền vào:

```env
MONGODB_URI=mongodb+srv://movie_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/movie_theater?retryWrites=true&w=majority
JWT_SECRET=movie_theater_secret_key_2026
PORT=5000
```

> ⚠️ Thay `YOUR_PASSWORD` bằng mật khẩu đã tạo ở Bước 1

---

## ⚡ Bước 3: Chạy backend

```bash
cd backend
npm run dev
```

Khi thành công bạn sẽ thấy:
```
✅ Kết nối MongoDB Atlas thành công!
🌱 Đã seed 2 tài khoản mẫu vào MongoDB
🚀 Backend đang chạy tại http://localhost:5000
```

---

## ⚡ Bước 4: Chạy app Expo

```bash
# Terminal mới (giữ terminal backend vẫn chạy)
cd ..
npx expo start
```

---

## 📡 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Kiểm tra server |
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Thông tin user (cần token) |
| PUT | `/api/auth/profile` | Cập nhật hồ sơ (cần token) |
| PUT | `/api/auth/change-password` | Đổi mật khẩu (cần token) |
| POST | `/api/auth/forgot-password` | Yêu cầu OTP |
| POST | `/api/auth/verify-otp` | Xác minh OTP |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |
| DELETE | `/api/auth/account` | Xóa tài khoản (cần token) |

---

## 🧪 Tài khoản test

| Email | Mật khẩu | Tier |
|-------|----------|------|
| customer@cinema.com | password123 | Gold |
| vip@cinema.com | password123 | VIP |

---

## 🔧 Thiết bị thật (cùng WiFi)

Nếu chạy app trên điện thoại thật, sửa `src/services/api.ts`:

```ts
// Thay localhost bằng IP máy tính của bạn
return 'http://192.168.x.x:5000/api';
```

Tìm IP: `ipconfig` (Windows) → IPv4 Address
