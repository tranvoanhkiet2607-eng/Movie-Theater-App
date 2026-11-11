# 🚀 Movie Theater Backend — RESTful API Server

Máy chủ xử lý nghiệp vụ cho ứng dụng Movie Theater, xây dựng bằng **Node.js**, **Express.js**, **MongoDB Atlas (Mongoose)** và **JSON Web Token (JWT)**.

---

## 🛠️ Công Nghệ Sử Dụng

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js 5
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Bảo mật:** Bcrypt.js (băm mật khẩu), JWT (xác thực phiên người dùng), CORS
- **DNS Resolver:** Tích hợp DNS Google (`8.8.8.8`) & Cloudflare (`1.1.1.1`) khắc phục lỗi phân giải SRV trên Windows.

---

## 📡 Danh Sách RESTful API Endpoints

### 1. Xác thực & Tài khoản (`/api/auth`)
| Phương thức | Endpoint | Mô tả | Quyền hạn |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Đăng ký tài khoản khách hàng mới | Public |
| `POST` | `/api/auth/login` | Đăng nhập nhận JWT Token | Public |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản đang đăng nhập | Bearer Token |
| `PUT` | `/api/auth/profile` | Cập nhật hồ sơ cá nhân | Bearer Token |
| `PUT` | `/api/auth/change-password` | Đổi mật khẩu tài khoản | Bearer Token |
| `POST` | `/api/auth/forgot-password/request-otp` | Gửi mã OTP khôi phục mật khẩu | Public |
| `POST` | `/api/auth/forgot-password/verify-otp` | Xác minh OTP | Public |
| `POST` | `/api/auth/forgot-password/reset-password` | Đặt lại mật khẩu mới | Public |

### 2. Danh mục Phim (`/api/movies`)
| Phương thức | Endpoint | Mô tả | Quyền hạn |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/movies` | Danh sách phim (tìm kiếm, lọc, phân trang) | Public |
| `GET` | `/api/movies/genres` | Danh sách thể loại phim duy nhất | Public |
| `GET` | `/api/movies/:id` | Chi tiết bộ phim | Public |
| `POST` | `/api/movies` | Thêm phim mới vào rạp | Admin |
| `PUT` | `/api/movies/:id` | Cập nhật thông tin phim | Admin |
| `DELETE` | `/api/movies/:id` | Xóa phim khỏi rạp | Admin |

### 3. Lịch chiếu & Rạp (`/api/showtimes`)
| Phương thức | Endpoint | Mô tả | Quyền hạn |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/showtimes` | Lịch chiếu theo ngày, rạp, phim và khung giờ | Public |
| `POST` | `/api/showtimes` | Tạo mới suất chiếu | Admin |
| `PUT` | `/api/showtimes/:id` | Cập nhật suất chiếu | Admin |
| `DELETE` | `/api/showtimes/:id` | Xóa suất chiếu | Admin |

### 4. Đặt vé & Thanh toán (`/api/bookings`)
| Phương thức | Endpoint | Mô tả | Quyền hạn |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings/my-tickets` | Lịch sử vé của người dùng | Bearer Token |
| `POST` | `/api/bookings` | Tạo đơn đặt vé, khóa ghế & thanh toán | Bearer Token |
| `GET` | `/api/bookings/:id` | Chi tiết vé điện tử & mã QR | Bearer Token |
| `PUT` | `/api/bookings/:id/cancel` | Hủy vé hợp lệ theo quy định rạp | Bearer Token |

### 5. Dịch vụ Bắp Nước & Khuyến mãi
- **Food & Beverage (`/api/food`):** Quản lý combo, bắp ngọt, nước có ga.
- **Promotions (`/api/promotions`):** Kiểm tra mã voucher và tính tiền chiết khấu (`/apply`).
- **Reviews (`/api/reviews`):** Bình luận và đánh giá số sao cho phim.
- **Membership (`/api/membership`):** Tích điểm và nâng hạng thành viên.
- **Reports (`/api/reports`):** Báo cáo doanh thu và thống kê vé rạp (Dành cho Admin).

---

## 💻 Hướng Dẫn Chạy Backend

1. Tạo file `.env` từ file mẫu `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Chạy server ở chế độ phát triển (auto-reload):
   ```bash
   npm run dev
   ```
4. Kiểm tra sức khỏe hệ thống:
   Truy cập `http://localhost:5000/health` trên trình duyệt để kiểm tra trạng thái kết nối Database.
