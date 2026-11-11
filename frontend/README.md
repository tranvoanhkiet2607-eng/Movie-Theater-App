# 📱 Frontend — Movie Theater App (React Native / Expo)

Ứng dụng di động và web dành cho khách hàng đặt vé xem phim và ban quản trị rạp CineMax, phát triển bằng **React Native**, **Expo Router v54** và **TypeScript**.

---

## 🛠️ Công Nghệ Nền Tảng

- **Framework:** React Native 0.86 / Expo SDK 54
- **Navigation:** Expo Router (File-based routing)
- **State Management:** React Context API (`AuthContext`)
- **Icon Library:** `@expo/vector-icons` (Ionicons)
- **Networking:** Fetch API kết hợp `AsyncStorage` lưu trữ JWT Token và thiết lập người dùng.

---

## 🚀 Hướng Dẫn Khởi Chạy

### 1. Cài đặt dependencies (từ thư mục `frontend/`):
```bash
cd frontend
npm install
```

### 2. Khởi chạy Expo Dev Server:
```bash
npx expo start
```

### 3. Phím tắt điều khiển trên terminal của Expo:
- Nhấn **`a`** — Tự động mở ứng dụng trên thiết bị Android hoặc máy ảo (LDPlayer, Nox, Android Studio Emulator).
- Nhấn **`w`** — Chạy trên trình duyệt Web (`http://localhost:8081`).
- Nhấn **`r`** — Tải lại ứng dụng (Reload app).
- Nhấn **`m`** — Bật/Tắt menu công cụ nhà phát triển (Dev Menu).

---

## 📱 Hướng Dẫn Chạy & Kiểm Thử Trên Giả Lập LDPlayer

1. Khởi động máy ảo **LDPlayer**.
2. Đảm bảo đã cài ứng dụng **Expo Go** trên LDPlayer (tải từ CH Play hoặc kéo file `.apk` vào).
3. Tại terminal Expo trên máy tính, nhấn phím **`a`** để Expo tự động kết nối qua ADB.
4. **Cơ chế kết nối Backend tự động:**
   - File [`src/services/api.ts`](src/services/api.ts) sử dụng hàm `getBaseUrl()` tự động nhận diện địa chỉ IP mạng LAN của máy chủ thông qua `Constants.expoConfig.hostUri`.
   - Giúp máy ảo LDPlayer gọi trực tiếp vào API Backend (cổng 5000) mà không cần cấu hình thủ công `localhost`.

---

## 📂 Cấu Trúc Thư Mục `frontend/`

```text
frontend/
├── assets/                 # Hình ảnh, biểu tượng rạp, poster mẫu
├── src/
│   ├── app/                # Các màn hình định tuyến (Expo Router file-based)
│   │   ├── _layout.tsx     # Root layout bọc ThemeProvider & AuthProvider
│   │   ├── index.tsx       # Trang chủ (Banner, phim nổi bật, rạp gần bạn)
│   │   ├── movies.tsx      # Danh mục phim (Xem, tìm kiếm, lọc thể loại)
│   │   ├── explore.tsx     # Lịch chiếu (Theo rạp, ngày chiếu, khung giờ)
│   │   ├── profile.tsx     # Quản lý tài khoản, tích điểm, vé xem phim
│   │   ├── login.tsx       # Màn hình đăng nhập
│   │   └── register.tsx    # Màn hình đăng ký thành viên
│   ├── components/         # UI Components dùng chung (Header, Tabs, Modals...)
│   ├── constants/          # Bảng màu (Theme colors), Spacing, Typography
│   ├── context/            # AuthContext (Đăng nhập, đăng ký, phiên làm việc)
│   ├── features/           # Các phân hệ chức năng chuyên biệt
│   │   ├── admin/          # Trung tâm quản trị Admin (Quản lý phim, rạp, doanh thu)
│   │   ├── booking/        # Sơ đồ chọn ghế, chọn bắp nước, xuất vé điện tử E-Ticket
│   │   ├── movies/         # Thẻ phim, tìm kiếm debounce, modal chi tiết phim
│   │   └── reviews/        # Đánh giá phim và bình luận cộng đồng
│   ├── services/           # Service kết nối RESTful API (`api.ts`, `movieApi.ts`)
│   └── types/              # Khai báo kiểu TypeScript (`auth.ts`, `showtime.ts`...)
├── app.json                # Cấu hình dự án Expo
├── tsconfig.json           # Cấu hình TypeScript
└── package.json
```
