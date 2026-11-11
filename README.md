# 🎬 Movie Theater — Hệ Thống Đặt Vé Xem Phim

Dự án ứng dụng đặt vé xem phim và quản lý rạp chiếu phim hiện đại, bao gồm **Backend (Node.js + Express + MongoDB)** và **Frontend (React Native + Expo Router + TypeScript)**.

---

## 👥 Đội Ngũ Phát Triển (Project Contributors)

| STT | Họ và Tên | MSSV | Vai Trò | GitHub |
| :---: | :--- | :---: | :--- | :--- |
| **1** | **Trần Võ Anh Kiệt** | **CE180795** | **Project Owner / Booking Management & Payment** | [@tranvoanhkiet2607-eng](https://github.com/tranvoanhkiet2607-eng) |
| 2 | Nguyễn Minh Quân | CE180048 | Core Developer / Showtimes & Theaters | [@minhq](https://github.com/minhq) |
| 3 | Lê Phúc Nghĩa | CE181020 | Core Developer / Authentication & Members | [@LePhucNghia](https://github.com/LePhucNghia) |
| 4 | Thái Chương | CE190202 | Core Developer / Food & Concessions | [@ThaiChuong67](https://github.com/ThaiChuong67) |
| 5 | Lâm Anh Quý | CE191736 | Core Developer / Movie Catalog & Media | [@quylace191736](https://github.com/quylace191736) |

---

## 📁 Cấu Trúc Dự Án

```text
Movie-Theater-App/
├── backend/                # REST API Server (Node.js, Express, Mongoose, JWT)
│   ├── models/             # Mongoose Schemas (User, Movie, Showtime, Booking, Food...)
│   ├── routes/             # API Routes (/api/auth, /api/movies, /api/bookings...)
│   ├── seed/               # Dữ liệu khởi tạo mẫu
│   ├── server.js           # Entry point của Express Server
│   ├── .env                # Biến môi trường (MONGODB_URI, JWT_SECRET, PORT)
│   └── package.json
│
├── frontend/               # Ứng dụng Mobile & Web (React Native, Expo Router, TypeScript)
│   ├── assets/             # Hình ảnh, biểu tượng
│   ├── src/
│   │   ├── app/            # Các màn hình ứng dụng (Expo Router)
│   │   ├── components/     # UI Components dùng chung
│   │   ├── constants/      # Theme & Colors
│   │   ├── context/        # Quản lý trạng thái (AuthContext)
│   │   ├── features/       # Modules theo tính năng (Movies, Booking, Admin, Reviews...)
│   │   ├── services/       # Gọi API tới Backend (api.ts)
│   │   └── types/          # TypeScript Interfaces
│   ├── app.json
│   └── package.json
│
└── package.json            # Script chạy đồng thời cả Backend & Frontend (concurrently)
```

---

## ⚡ Khởi Chạy Dự Án

### 1. Cài đặt dependencies (từ thư mục gốc)
```bash
npm run install:all
```

### 2. Chạy cả Backend và Frontend cùng lúc
```bash
# Chạy Backend (watch mode) + Frontend (Expo)
npm run dev

# Hoặc chạy Backend + Frontend Web
npm run dev:web

# Hoặc chạy Backend + Frontend Android (máy thật / LDPlayer / Emulator)
npm run dev:android
```

### 3. Các lệnh có sẵn trong `package.json` gốc:

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy đồng thời **Backend (`npm run dev`)** và **Frontend (`npm start`)** |
| `npm start` | Chạy đồng thời **Backend (`npm start`)** và **Frontend (`npm start`)** |
| `npm run dev:web` | Chạy đồng thời **Backend** và **Frontend Web** |
| `npm run dev:android` | Chạy đồng thời **Backend** và **Frontend Android** |
| `npm run backend` | Chỉ chạy riêng **Backend** |
| `npm run frontend` | Chỉ chạy riêng **Frontend** |
| `npm run install:all` | Cài đặt `node_modules` cho cả `root`, `backend/` và `frontend/` |

---

## 🔧 Chạy Riêng Từng Phần (2 Terminal Độc Lập)

### Terminal 1 — Backend (Express + MongoDB)
```bash
cd backend
npm run dev
```

### Terminal 2 — Frontend (React Native / Expo)
```bash
cd frontend
npx expo start
```
