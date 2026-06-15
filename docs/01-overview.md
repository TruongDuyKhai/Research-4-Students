# Tổng quan dự án "Research 4 Student"

Dự án **Research 4 Student (R4S)** là một nền tảng hỗ trợ tự học, định hướng nghiên cứu khoa học và cộng tác học thuật trực tuyến dành cho sinh viên và giảng viên tại Đại học FPT. Hệ thống được triển khai dưới cấu trúc monorepo bao gồm mã nguồn React Frontend (Vite) trong thư mục `client/` và Express Backend (Node.js) kết hợp với 7 cơ sở dữ liệu SQLite riêng biệt trong thư mục `server/`.

## 1. Các thư viện phụ thuộc chính (Dependencies)

### React Frontend (`client/package.json`)
| Thư viện | Phiên bản | Mô tả |
| :--- | :--- | :--- |
| `react` | `^19.2.6` | Thư viện giao diện chính |
| `react-dom` | `^19.2.6` | Render React components vào DOM |
| `react-router-dom` | `^6.23.1` | Quản lý định tuyến phía Client |
| `axios` | `^1.7.2` | Client thực hiện các request HTTP |
| `i18next` / `react-i18next` | `^23.11.5` / `^14.1.2` | Hỗ trợ đa ngôn ngữ (English / Tiếng Việt) |
| `react-markdown` | `^10.1.0` | Thư viện hiển thị nội dung định dạng Markdown |
| `lucide-react` | `^1.18.0` | Bộ thư viện icon giao diện |

### Express Backend (`server/package.json`)
| Thư viện | Phiên bản | Mô tả |
| :--- | :--- | :--- |
| `express` | `^4.19.2` | Node.js web server framework |
| `better-sqlite3` | `^11.3.0` | Driver SQLite hiệu năng cao để lưu trữ dữ liệu |
| `jsonwebtoken` | `^9.0.2` | Khởi tạo và xác thực token phiên làm việc (JWT) |
| `bcryptjs` | `^2.4.3` | Mã hóa mật khẩu người dùng |
| `google-auth-library` | `^9.11.0` | Xác thực ID token từ Google OAuth |
| `discord.js` | `^14.15.3` | Client tương tác với Discord API dùng làm kho lưu trữ CDN |
| `multer` | `^1.4.5-lts.1` | Middleware xử lý tải lên tệp tin (multipart/form-data) |
| `express-rate-limit` | `^7.3.1` | Giới hạn tần suất gửi yêu cầu để chống spam API |
| `helmet` | `^7.1.0` | Bảo mật HTTP headers |
| `cors` | `^2.8.5` | Cho phép chia sẻ tài nguyên nguồn gốc chéo |
| `node-cron` | `^3.0.3` | Lập lịch tác vụ định kỳ tự động |

---

## 2. Cây thư mục hệ thống (Folder Tree)
Cây thư mục rút gọn (bỏ qua `node_modules`, `dist`, `db/data`):

```text
research4student/
├── client/
│   ├── src/
│   │   ├── api/             # Cấu hình axios client
│   │   ├── assets/          # Ảnh, logo tĩnh
│   │   ├── components/      # Các React components dùng chung
│   │   ├── contexts/        # Auth, Theme, Features context providers
│   │   ├── i18n/            # Tập tin dịch thuật đa ngôn ngữ (locales)
│   │   ├── layouts/         # Layout khung (MainLayout, AuthLayout, AdminLayout)
│   │   ├── pages/           # Các trang giao diện chính
│   │   ├── styles/          # Biến CSS và CSS global resets
│   │   └── utils/           # Helper functions giao diện
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── config/          # Cấu hình feature flags hệ thống
│   │   ├── db/
│   │   │   ├── connections.js # Kết nối 7 databases SQLite độc lập
│   │   │   └── schema/      # Tập tin khởi tạo cấu trúc các bảng SQL
│   │   ├── middleware/      # Auth, rate limits, turnstile, cooldown, banlist
│   │   ├── models/          # Wrapper models quản lý dữ liệu SQLite
│   │   ├── routes/          # Express route controllers
│   │   ├── services/        # Tác vụ nền (Discord storage, CDN refresher)
│   │   └── utils/           # JWT, chuẩn hóa email, chuyển đổi JSON
│   ├── package.json
│   └── src/index.js
├── docs/                    # Thư mục chứa tài liệu đặc tả kiến trúc thực tế
└── README.md
```

---

## 3. Vai trò người dùng & Cơ chế đăng nhập (User Roles & Auth)
Hệ thống quản lý xác thực cho 3 vai trò khác nhau (phân biệt dựa trên trường `role` của token JWT và bản ghi dữ liệu):

### a. Sinh viên (Student)
Sinh viên có hai phương thức đăng nhập chạy song song:
1. **Google OAuth**: Nút bấm GIS nhận Token ID trên Frontend, gửi lên `POST /api/auth/google`, backend verify token qua `google-auth-library` và tìm/liên kết tài khoản.
2. **Email + Mật khẩu**: Sinh viên đăng ký tài khoản qua `POST /api/auth/student/register` (bắt buộc dùng email `@gmail.com` hoặc `@googlemail.com`, email được chuẩn hóa tự động loại bỏ dấu chấm và phần mở rộng sau dấu cộng). Đăng nhập qua `POST /api/auth/student/login` bằng email và mật khẩu đã tạo.

### b. Giảng viên (Teacher)
Giảng viên không thể tự đăng ký tài khoản. Tài khoản được tạo bởi Admin thông qua trang quản trị.
- **Phương thức đăng nhập**: Đăng nhập bằng Email và mật khẩu tạm thời do Admin cấp qua `POST /api/auth/teacher/login`.
- **Đổi mật khẩu bắt buộc**: Trường `must_change_password` được đặt thành `1` ban đầu, buộc giảng viên phải cập nhật mật khẩu mới qua `POST /api/auth/change-password` trước khi có thể truy cập các tính năng chính.

### c. Quản trị viên (Admin)
Quản trị viên là một tài khoản tĩnh duy nhất, thông tin tài khoản không lưu trong cơ sở dữ liệu `users.db` mà được định cấu hình trực tiếp qua biến môi trường.
- **Phương thức đăng nhập**: Đăng nhập bằng Email và Mật khẩu lấy trực tiếp từ biến môi trường `ADMIN_EMAIL` và `ADMIN_PASSWORD` của Backend qua endpoint `POST /api/auth/admin/login`. Trả về JWT token mang định danh `id: 0, role: "admin", username: "admin"`.

---

Tài liệu này tạo bằng cách quét source code. Khi thêm route/bảng/trang mới, cập nhật file docs/ liên quan hoặc chạy lại prompt tạo docs.
