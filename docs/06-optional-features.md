# Đặc tả Các tính năng tùy chọn (Feature Flags)

Hệ thống cung cấp cơ chế **Feature Flags** động để tự động phát hiện sự hiện diện của các cấu hình tích hợp ngoài. Khi thiếu cấu hình, hệ thống sẽ tự động hạ cấp tính năng một cách mượt mà (degrade gracefully) thay vì gây crash ứng dụng hoặc hiển thị các giao diện lỗi/vô dụng.

---

## 1. Logic kiểm tra cấu hình (`server/src/config/features.js`)

Mã nguồn kiểm tra cấu hình hiện tại ở Backend:

```javascript
function isSet(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

const features = {
  googleAuth: isSet('GOOGLE_CLIENT_ID'),
  captcha: isSet('TURNSTILE_SECRET_KEY'),
  discordStorage: isSet('DISCORD_BOT_TOKEN') && isSet('DISCORD_STORAGE_CHANNEL_ID'),
};

module.exports = features;
```

---

## 2. Chi tiết các Feature Flags & Hành vi hệ thống

### a. Đăng nhập Google (`googleAuth`)
- **Biến môi trường tương ứng**: `GOOGLE_CLIENT_ID` (Backend) và `VITE_GOOGLE_CLIENT_ID` (Frontend).
- **Hành vi khi Flag = `false`**:
  - **Backend**: Route `POST /api/auth/google` chặn yêu cầu ngay dòng đầu tiên, trả về HTTP `503 Service Unavailable` kèm mã lỗi:
    ```json
    {
      "error": {
        "code": "FEATURE_DISABLED",
        "message": "Google sign-in is not configured on this server yet."
      }
    }
    ```
  - **Frontend**: Trang Đăng nhập (`LoginPage.jsx`) ẩn hoàn toàn nút "Sign in with Google" và đường gạch kẻ phân tách "hoặc", chuyển sang dùng form đăng nhập bằng Gmail + Mật khẩu làm phương án duy nhất. Tránh gọi khởi tạo Google Identity Services (GIS) để không gây lỗi console.

### b. CAPTCHA Chống Spam (`captcha`)
- **Biến môi trường tương ứng**: `TURNSTILE_SECRET_KEY` (Backend) và `VITE_TURNSTILE_SITE_KEY` (Frontend).
- **Hành vi khi Flag = `false`**:
  - **Backend**: Middleware `verifyTurnstile` tự động bypass kiểm tra, in ra cảnh báo trong log `[Turnstile] TURNSTILE_SECRET_KEY is not configured. Bypassing validation.` và gọi `next()` cho phép request đi tiếp mà không cần token.
  - **Frontend**: Giao diện Captcha (`Turnstile.jsx`) không hiển thị widget Cloudflare mà render dòng thông báo nhỏ: `"CAPTCHA verification is currently disabled."`. Đồng thời, component tự động gọi callback `onVerify('captcha-disabled')` ngay lập tức để cấp token giả lập. Nhờ đó, các nút submit biểu mẫu có điều kiện `disabled={!turnstileToken}` (Đăng bài, bình luận, tạo nhóm...) hoạt động bình thường, không bị khóa vĩnh viễn.

### c. Lưu trữ Tệp qua Discord (`discordStorage`)
- **Biến môi trường tương ứng**: Cần điền đồng thời cả `DISCORD_BOT_TOKEN` và `DISCORD_STORAGE_CHANNEL_ID` (Backend).
- **Hành vi khi Flag = `false`**:
  - **Backend**:
    - Route upload tệp tin `POST /api/files/upload` chặn yêu cầu ngay dòng đầu tiên, trả về HTTP `503 Service Unavailable` kèm lỗi:
      ```json
      {
        "error": {
          "code": "FEATURE_DISABLED",
          "message": "File uploads are not configured on this server yet."
        }
      }
      ```
    - Route upload ảnh đại diện `POST /api/users/me/avatar` chặn yêu cầu tương tự và trả về HTTP `503 Service Unavailable` cùng lỗi trên.
    - Tiến trình Discord Client (`discordClient.js`) tự động bỏ qua việc login bot và xuất cảnh báo trong log:
      `DISCORD_BOT_TOKEN is not configured. Discord functionality will be unavailable.`
