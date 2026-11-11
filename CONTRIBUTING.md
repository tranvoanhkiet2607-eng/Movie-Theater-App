# 🤝 Hướng Dẫn Đóng Góp (Contributing Guidelines)

Chào mừng các thành viên tham gia phát triển dự án **Movie Theater App**! Để đảm bảo mã nguồn luôn ổn định, sạch sẽ và dễ bảo trì, vui lòng tuân thủ các quy chuẩn dưới đây trước khi commit và tạo Pull Request.

---

## 🌿 1. Quy Chuẩn Đặt Tên Nhánh (Branch Naming)

Mỗi tính năng hoặc sửa lỗi cần được tạo trên một nhánh riêng biệt tách từ nhánh `main`:

- **Tính năng mới:** `feature/<tên-tính-năng>` (Ví dụ: `feature/seat-selection`, `feature/payment-gateway`)
- **Sửa lỗi:** `fix/<tên-lỗi>` (Ví dụ: `fix/mongo-dns-timeout`, `fix/login-validation`)
- **Tài liệu:** `docs/<tên-nội-dung>` (Ví dụ: `docs/api-guide`)
- **Tối ưu / Tái cấu trúc:** `refactor/<tên-module>`

---

## ✍️ 2. Quy Chuẩn Commit Message (Conventional Commits)

Định dạng commit message theo chuẩn quốc tế:
```text
<loại>(<phạm vi>): <mô tả ngắn gọn bằng tiếng Anh hoặc tiếng Việt>
```

### Các loại commit (Types):
- `feat`: Tính năng mới cho người dùng hoặc hệ thống
- `fix`: Sửa lỗi phát sinh trong mã nguồn
- `docs`: Thêm hoặc chỉnh sửa tài liệu hướng dẫn (README, API docs)
- `style`: Định dạng code (khoảng trắng, dấu chấm phẩy) không ảnh hưởng logic
- `refactor`: Tái cấu trúc code (không thêm tính năng, không sửa lỗi)
- `perf`: Cải thiện hiệu năng xử lý
- `test`: Thêm hoặc cập nhật unit test
- `chore`: Cập nhật cấu hình build tool, package.json, git config

---

## 🔍 3. Quy Trình Tạo Pull Request (PR Workflow)

1. **Pull mã nguồn mới nhất từ `main`:**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Tạo nhánh làm việc:**
   ```bash
   git checkout -b feature/<tên-tính-năng>
   ```
3. **Kiểm tra trước khi commit:**
   - Đảm bảo Backend không bị lỗi cú pháp: `node -c backend/server.js`
   - Đảm bảo Frontend không bị lỗi TypeScript: `cd frontend && npx tsc --noEmit`
4. **Push nhánh lên GitHub:**
   ```bash
   git push -u origin feature/<tên-tính-năng>
   ```
5. **Tạo Pull Request:**
   - Mở PR trên GitHub với tiêu đề rõ ràng, mô tả các Use Case (UC) đã thực hiện.
   - Chờ Lead Reviewer kiểm tra trước khi tiến hành Merge vào nhánh `main`.
