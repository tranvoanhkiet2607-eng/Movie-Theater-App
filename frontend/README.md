# 📱 Frontend — Movie Theater App (React Native / Expo)

Ứng dụng di động & web đặt vé xem phim được xây dựng bằng **React Native** và **Expo Router**.

## 🚀 Chạy ứng dụng

1. Cài đặt thư viện (nếu chưa cài):

   ```bash
   cd frontend
   npm install
   ```

2. Khởi chạy Expo Dev Server:

   ```bash
   npx expo start
   ```

3. Các lệnh tiện ích:
   - `npm run web` — Chạy trên trình duyệt Web
   - `npm run android` — Chạy trên máy ảo Android
   - `npm run ios` — Chạy trên máy ảo iOS
   - `npm run lint` — Kiểm tra lỗi ESLint

## 📂 Cấu trúc thư mục `frontend/`

```text
frontend/
├── assets/                 # Hình ảnh, icon, splash screen
├── scripts/                # Script tiện ích của Expo
├── src/
│   ├── app/                # Các màn hình (Expo Router file-based routing)
│   ├── components/         # Component dùng chung (Navigation tabs, UI...)
│   ├── constants/          # Cấu hình màu sắc, kích thước, theme
│   ├── context/            # React Context (AuthContext...)
│   ├── hooks/              # Custom hooks
│   ├── services/           # Kết nối REST API tới Backend Express (api.ts)
│   └── types/              # Khai báo kiểu TypeScript
├── app.json                # Cấu hình Expo
├── package.json
└── tsconfig.json
```

