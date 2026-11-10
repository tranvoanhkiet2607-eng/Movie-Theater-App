# 🎬 Movie Theater — Hệ Thống Đặt Vé Xem Phim

Dự án được chia thành 2 thư mục độc lập cho **Backend (Node.js + Express + MongoDB)** và **Frontend (React Native + Expo)**, đi kèm `package.json` ở thư mục gốc để chạy song song cả 2 dự án cùng lúc.

```text
Movie_Theater/
├── backend/                # REST API Server (Node.js, Express, Mongoose, JWT)
│   ├── models/             # Mongoose Schemas (User...)
│   ├── routes/             # API Routes (/api/auth...)
│   ├── server.js           # Entry point của Express Server
│   ├── .env                # Biến môi trường (MONGODB_URI, JWT_SECRET, PORT)
│   └── package.json
│
├── frontend/               # Ứng dụng Mobile & Web (React Native, Expo Router, TypeScript)
│   ├── assets/             # Hình ảnh, biểu tượng
│   ├── src/
│   │   ├── app/            # Các màn hình ứng dụng (Expo Router)
│   │   ├── components/     # UI Components
│   │   ├── constants/      # Theme & Constants
│   │   ├── context/        # Quản lý trạng thái (AuthContext)
│   │   ├── services/       # Gọi API tới Backend (api.ts)
│   │   └── types/          # TypeScript Interfaces
│   ├── app.json
│   └── package.json
│
└── package.json            # Script chạy đồng thời cả Backend & Frontend (concurrently)
```

---

## ⚡ Chạy đồng thời cả 2 dự án (từ thư mục gốc `Movie_Theater`)

```bash
# Cài đặt toàn bộ dependencies cho root, backend và frontend
npm run install:all

# Chạy cả Backend (watch mode) + Frontend (Expo) cùng lúc
npm run dev

# Hoặc chạy cả Backend + Frontend Web cùng lúc
npm run dev:web
```

### Các lệnh có sẵn ở `package.json` gốc:

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

## 🔧 Chạy riêng từng phần (nếu muốn mở 2 terminal riêng)

### 1. Backend (Express + MongoDB)

```bash
cd backend
npm run dev
```

### 2. Frontend (React Native / Expo)

```bash
cd frontend
npx expo start
```

