# Cấu trúc Định tuyến Frontend (Frontend Routes)

Định tuyến của ứng dụng React được định nghĩa tại tập tin [App.jsx](file:///e:/Code/site/research4student/client/src/App.jsx) sử dụng thư viện `react-router-dom` v6. Phân quyền truy cập được enforcer bằng component `<ProtectedRoute>` hoặc logic bọc trong wrapper đặc thù.

---

## Danh sách Định tuyến Frontend (Frontend Routes Map)

| Route Path | Component File | Layout | Đăng nhập / Phân quyền | Mô tả ngắn chức năng |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `HomePage.jsx` | `MainLayout` | Public | Trang chủ hiển thị thông tin giới thiệu, tài nguyên gợi ý và bài viết mới nổi bật. |
| `/resources` | `ResourcesPage.jsx` | `MainLayout` | Public | Trang danh mục tra cứu các trang web, công cụ hỗ trợ nghiên cứu khoa học. |
| `/resources/:id` | `ResourceDetailPage.jsx` | `MainLayout` | Public | Trang hiển thị thông tin chi tiết và liên kết truy cập một công cụ nghiên cứu cụ thể. |
| `/knowledge` | `KnowledgePage.jsx` | `MainLayout` | Public | Trang thư viện kiến thức cơ bản về nghiên cứu khoa học theo môn học và chủ đề. |
| `/knowledge/articles/:id` | `ArticleDetailPage.jsx` | `MainLayout` | Public | Trang hiển thị nội dung bài viết học thuật chi tiết và tải xuống tệp PDF đính kèm. |
| `/guides` | `GuidesPage.jsx` | `MainLayout` | Public | Trang tra cứu các tài liệu đề cương nghiên cứu mẫu cho sinh viên tham khảo. |
| `/guides/:id` | `GuideDetailPage.jsx` | `MainLayout` | Public | Trang xem chi tiết tài liệu hướng dẫn viết đề cương và thực hiện hành động tải xuống. |
| `/community` | `CommunityPage.jsx` | `MainLayout` | Public | Trang diễn đàn chung thảo luận học thuật công khai giữa các sinh viên. |
| `/community/posts/:id` | `PostDetailPage.jsx` | `MainLayout` | Public | Trang hiển thị chi tiết bài đăng diễn đàn kèm theo cây bình luận thảo luận lồng nhau. |
| `/community/projects` | `CommunityPage.jsx` (tab projects) | `MainLayout` | `student`, `teacher`, `admin` | Trang quản lý danh sách các nhóm dự án nghiên cứu khoa học và thư mời của cá nhân. |
| `/community/projects/:id` | `ProjectDetailPage.jsx` | `MainLayout` | `student`, `teacher`, `admin` | Trang không gian làm việc thảo luận nội bộ dành cho các thành viên nhóm nghiên cứu. |
| `/profile` | `ProfilePage.jsx` | `MainLayout` | `student`, `teacher`, `admin` | Trang thiết lập thông tin cá nhân, tải lên ảnh đại diện và tùy chọn giao diện ngôn ngữ/theme. |
| `/u/:username` | `PublicProfilePage.jsx` | `MainLayout` | Public | Trang hiển thị thông tin cá nhân công khai của người dùng (không tiết lộ email). |
| `/set-username` | `SetUsernamePage.jsx` | `MainLayout` | `student` | Trang thiết lập tên người dùng (username) một lần duy nhất dành cho tài khoản sinh viên mới. |
| `<adminRoute>` * | `AdminHomePage.jsx` | `AdminLayout` | `admin` (Qua login wrapper) | Trang quản trị chính hiển thị số liệu thống kê tổng quan của hệ thống. |
| `<adminRoute>/teachers` * | `AdminTeachersPage.jsx` | `AdminLayout` | `admin` | Trang quản trị danh sách tài khoản giảng viên, cấp tài khoản mới và reset mật khẩu. |
| `<adminRoute>/users` * | `AdminUsersPage.jsx` | `AdminLayout` | `admin` | Trang quản trị danh sách tài khoản sinh viên và thực hiện cấm/mở cấm tài khoản. |
| `<adminRoute>/banned-keywords` * | `AdminBanlistPage.jsx` | `AdminLayout` | `admin` | Trang quản lý các từ khóa cấm kiểm duyệt nội dung tự động trên diễn đàn. |
| `<adminRoute>/reports` * | `AdminReportsPage.jsx` | `AdminLayout` | `admin` | Trang xử lý hàng đợi báo cáo vi phạm nội dung và ẩn bài đăng/bình luận vi phạm. |
| `/login` | `LoginPage.jsx` | `AuthLayout` | Public | Trang đăng nhập dành cho tài khoản sinh viên sử dụng Google OAuth hoặc Email+Password. |
| `/register` | `RegisterPage.jsx` | `AuthLayout` | Public | Trang đăng ký tài khoản sinh viên bằng địa chỉ Gmail cá nhân. |
| `/teacher-login` | `TeacherLoginPage.jsx` | `AuthLayout` | Public | Trang đăng nhập dành riêng cho tài khoản giảng viên. |
| `/teacher/change-password` | `TeacherChangePasswordPage.jsx` | `AuthLayout` | `teacher` | Trang bắt buộc giảng viên thay đổi mật khẩu khi đăng nhập bằng mật khẩu tạm. |

---

*Lưu ý*:
- `<adminRoute>` được cấu hình động thông qua biến môi trường `VITE_ADMIN_ROUTE` (giá trị mặc định là `/portal-mgmt-7f3a`).
- **AdminRouteWrapper**: Nếu người dùng chưa đăng nhập hoặc không có vai trò `admin` khi truy cập đường dẫn `<adminRoute>`, hệ thống sẽ hiển thị giao diện của trang `AdminLoginPage.jsx` trực tiếp dưới URL đó thay vì chuyển hướng trang. Nếu đã đăng nhập thành công với vai trò Admin, hệ thống sẽ trả về layout `AdminLayout`.
- Bất kỳ URL không khớp với danh sách trên sẽ tự động chuyển hướng về trang chủ (`/`).
