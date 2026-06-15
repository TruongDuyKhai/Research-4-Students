# Đặc tả API Endpoints (API Reference)

Tất cả các route điều hướng được khai báo trong thư mục `server/src/routes/` và mount thông qua router trung tâm trong [app.js](file:///e:/Code/site/research4student/server/src/app.js) dưới tiền tố `/api`.

---

## 1. Feature Flags Router (`config.js`)
*Mount Path*: `/api/config`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/config` | Public | Lấy trạng thái kích hoạt của các tích hợp (Google Auth, Captcha, Discord Storage). |

---

## 2. Authentication Router (`auth.js`)
*Mount Path*: `/api/auth`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/google` | Public | Đăng nhập/Đăng ký tài khoản Sinh viên bằng Google OAuth Token ID. |
| `POST` | `/api/auth/teacher/login` | Public | Đăng nhập Giảng viên bằng Email + Mật khẩu. |
| `POST` | `/api/auth/admin/login` | Public | Đăng nhập Quản trị viên sử dụng thông tin tài khoản cấu hình qua biến môi trường. |
| `POST` | `/api/auth/change-password` | `requireAuth` + `teacher` | Đổi mật khẩu cho Giảng viên (bắt buộc khi đổi mật khẩu tạm). |
| `POST` | `/api/auth/student/register` | Public (Rate limit: 10/15m) | Đăng ký Sinh viên bằng Gmail + Mật khẩu. |
| `POST` | `/api/auth/student/login` | Public (Rate limit: 10/15m) | Đăng nhập Sinh viên bằng Gmail + Mật khẩu. |
| `GET` | `/api/auth/me` | `requireAuth` | Lấy thông tin tài khoản người dùng đang đăng nhập trong phiên làm việc. |

---

## 3. Files Storage Router (`files.js`)
*Mount Path*: `/api/files`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/files/upload` | `requireAuth` | Tải lên một tệp tin (avatar, outline, bài viết...) lên channel Discord Storage CDN. |
| `GET` | `/api/files/:id` | Public | Lấy thông tin tệp tin, tự động refresh URL Discord CDN nếu liên kết cũ đã hết hạn. |

---

## 4. User Profiles Router (`users.js`)
*Mount Path*: `/api/users`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/me` | `requireAuth` (chặn Admin) | Lấy thông tin hồ sơ chi tiết (avatar, bio, teacher profiles...) của bản thân. |
| `PATCH` | `/api/users/me` | `requireAuth` (chặn Admin) | Cập nhật hồ sơ (sinh viên cập nhật bio/name; giảng viên chỉ cập nhật preferences). |
| `PUT` | `/api/users/me/username` | `requireAuth` + `student` | Khởi tạo username cho tài khoản sinh viên (thiết lập một lần duy nhất). |
| `GET` | `/api/users/check-username` | Public | Kiểm tra tính hợp lệ và sự tồn tại (sẵn có) của một username. |
| `POST` | `/api/users/me/avatar` | `requireAuth` (chặn Admin) | Tải lên ảnh đại diện mới và liên kết vào hồ sơ tài khoản. |
| `GET` | `/api/users/:username` | Public | Lấy thông tin hồ sơ công khai của một người dùng bất kỳ (đã lược bỏ email). |

---

## 5. Knowledge Base Router (`knowledge.js`)
*Mount Path*: `/api/knowledge`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/knowledge/subjects` | Public | Lấy danh sách toàn bộ môn học nghiên cứu khoa học kèm số lượng chủ đề. |
| `POST` | `/api/knowledge/subjects` | `requireAuth` + `admin`/`teacher` | Tạo một môn học mới (yêu cầu name, unique slug). |
| `PATCH` | `/api/knowledge/subjects/:id` | `requireAuth` + `admin`/`teacher` | Cập nhật tên hoặc slug môn học. |
| `DELETE` | `/api/knowledge/subjects/:id` | `requireAuth` + `admin` | Xóa một môn học và cascade tự động toàn bộ chủ đề/bài viết liên quan. |
| `GET` | `/api/knowledge/subjects/:id/topics` | Public | Lấy danh sách toàn bộ chủ đề thuộc một môn học. |
| `POST` | `/api/knowledge/topics` | `requireAuth` + `admin`/`teacher` | Tạo một chủ đề mới trong môn học. |
| `PATCH` | `/api/knowledge/topics/:id` | `requireAuth` + `admin`/`teacher` | Cập nhật thông tin chủ đề. |
| `DELETE` | `/api/knowledge/topics/:id` | `requireAuth` + `admin` | Xóa một chủ đề và cascade toàn bộ bài viết liên quan. |
| `GET` | `/api/knowledge/articles` | Public (Optional Auth) | Danh sách bài viết. Giảng viên/Admin có thể xem các bản nháp (drafts) của họ. |
| `GET` | `/api/knowledge/articles/:id` | Public (Optional Auth) | Xem nội dung chi tiết bài viết (bản nháp chỉ hiển thị với tác giả hoặc admin). |
| `POST` | `/api/knowledge/articles` | `requireAuth` + `admin`/`teacher` | Tạo một bài viết hướng dẫn mới (status: draft hoặc published). |
| `PATCH` | `/api/knowledge/articles/:id` | `requireAuth` + `admin`/`teacher` | Cập nhật bài viết (chỉ áp dụng đối với tác giả bài viết hoặc Admin). |
| `DELETE` | `/api/knowledge/articles/:id` | `requireAuth` + `admin`/`teacher` | Xóa bài viết (chỉ áp dụng đối với tác giả bài viết hoặc Admin). |

---

## 6. Resources Directory Router (`resources.js`)
*Mount Path*: `/api/resources`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/resources` | Public | Lấy danh sách website nghiên cứu khoa học có phân trang, bộ lọc và tìm kiếm. |
| `GET` | `/api/resources/:id` | Public | Lấy chi tiết thông tin website công cụ hỗ trợ nghiên cứu. |
| `POST` | `/api/resources` | `requireAuth` + `admin`/`teacher` | Đăng tải thông tin website công cụ hỗ trợ nghiên cứu khoa học mới. |
| `PATCH` | `/api/resources/:id` | `requireAuth` + `admin`/`teacher` | Sửa thông tin website công cụ hỗ trợ (chỉ áp dụng đối với người tạo hoặc Admin). |
| `DELETE` | `/api/resources/:id` | `requireAuth` + `admin`/`teacher` | Xóa thông tin website công cụ hỗ trợ (chỉ áp dụng đối với người tạo hoặc Admin). |

---

## 7. Outlines Guides Router (`guides.js`)
*Mount Path*: `/api/guides`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/guides` | Public | Danh sách đề cương mẫu và hướng dẫn viết đề cương nghiên cứu khoa học. |
| `GET` | `/api/guides/:id` | Public | Lấy thông tin siêu dữ liệu (metadata) của một đề cương mẫu cụ thể. |
| `GET` | `/api/guides/:id/download` | `requireAuth` | Lấy link download tài liệu (chặn trả về link tải nếu là tài liệu Pro: lỗi `PRO_FEATURE_DEMO`). |
| `POST` | `/api/guides` | `requireAuth` + `admin`/`teacher` | Đăng tải một mẫu tài liệu hướng dẫn/đề cương mẫu mới. |
| `PATCH` | `/api/guides/:id` | `requireAuth` + `admin`/`teacher` | Sửa tài liệu hướng dẫn (chỉ dành cho giảng viên tạo tài liệu hoặc Admin). |
| `DELETE` | `/api/guides/:id` | `requireAuth` + `admin`/`teacher` | Xóa tài liệu hướng dẫn (chỉ dành cho giảng viên tạo tài liệu hoặc Admin). |

---

## 8. Collaborative Projects Router (`projects.js`)
*Mount Path*: `/api/community/projects`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/community/projects` | Public | Lấy danh sách các nhóm nghiên cứu khoa học công khai (visibility: public). |
| `GET` | `/api/community/projects/invites/me` | `requireAuth` | Lấy danh sách lời mời tham gia nhóm nghiên cứu gửi tới người dùng. |
| `POST` | `/api/community/projects/invites/:inviteId/respond` | `requireAuth` | Chấp nhận (gia nhập nhóm) hoặc Từ chối lời mời cộng tác nghiên cứu. |
| `GET` | `/api/community/projects/:id` | Public | Xem thông tin chi tiết một nhóm nghiên cứu khoa học và danh sách thành viên. |
| `POST` | `/api/community/projects` | `requireAuth` | Khởi tạo một nhóm cộng tác nghiên cứu khoa học mới (cooldown: 120 giây). |
| `PATCH` | `/api/community/projects/:id` | `requireAuth` | Sửa thông tin dự án/trạng thái/quyền riêng tư (chỉ dành cho Chủ nhóm - Owner). |
| `DELETE` | `/api/community/projects/:id` | `requireAuth` | Xóa dự án nghiên cứu và toàn bộ bài viết nội bộ (Chủ nhóm hoặc Admin). |
| `POST` | `/api/community/projects/:id/invite` | `requireAuth` | Mời một sinh viên khác gia nhập nhóm nghiên cứu bằng username (Chủ nhóm). |
| `DELETE` | `/api/community/projects/:id/members/:userId` | `requireAuth` | Trục xuất một thành viên ra khỏi nhóm dự án nghiên cứu khoa học (Chủ nhóm). |
| `GET` | `/api/community/projects/:id/posts` | Public (Check Member) | Danh sách bài đăng nội bộ của dự án. Nếu dự án private, chặn nếu không phải thành viên. |
| `POST` | `/api/community/projects/:id/posts` | `requireAuth` | Tạo bài đăng thảo luận nội bộ trong nhóm dự án (Chỉ thành viên; cooldown: 60s). |

---

## 9. Community Forum Router (`community.js`)
*Mount Path*: `/api/community`

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/community/posts` | Public | Lấy danh sách bài viết diễn đàn (hỗ trợ lọc theo tag, username tác giả). |
| `GET` | `/api/community/posts/:id` | Public | Xem nội dung chi tiết bài viết diễn đàn cùng tệp đính kèm. |
| `POST` | `/api/community/posts` | `requireAuth` | Gửi bài viết mới lên diễn đàn thảo luận chung (cooldown: 60 giây). |
| `PATCH` | `/api/community/posts/:id` | `requireAuth` | Chỉnh sửa nội dung bài đăng diễn đàn (chỉ áp dụng với tác giả/giảng viên/admin). |
| `DELETE` | `/api/community/posts/:id` | `requireAuth` | Xóa bài đăng diễn đàn (chuyển trạng thái sang deleted; tác giả/giảng viên/admin). |
| `GET` | `/api/community/posts/:id/comments` | Public | Lấy danh sách bình luận dưới dạng cây phân cấp (nested replies). |
| `POST` | `/api/community/posts/:id/comments` | `requireAuth` | Viết bình luận hoặc trả lời một bình luận khác trong bài viết (cooldown: 15s). |
| `DELETE` | `/api/community/comments/:id` | `requireAuth` | Xóa bình luận (chuyển trạng thái sang deleted; tác giả/giảng viên/admin). |
| `POST` | `/api/community/reactions` | `requireAuth` | Thả/Hủy tương tác cảm xúc (like) đối với bài viết hoặc bình luận. |
| `GET` | `/api/community/reactions` | Public (Optional Auth) | Lấy số lượng tương tác cảm xúc và kiểm tra xem bản thân đã like chưa. |
| `POST` | `/api/community/reports` | `requireAuth` | Gửi báo cáo vi phạm nội dung (bài viết/bình luận) lên hệ thống Admin. |

---

## 10. Admin Console Router (`admin.js`)
*Mount Path*: `/api/admin`

*Lưu ý*: Toàn bộ router này đều được bọc trong middleware xác thực Admin: `requireAuth` và `requireRole(['admin'])`.

| Method | Path | Auth | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/teachers` | Admin | Liệt kê và tìm kiếm danh sách tài khoản giảng viên trong hệ thống. |
| `POST` | `/api/admin/teachers` | Admin | Tạo tài khoản giảng viên mới, cấp mật khẩu tạm ngẫu nhiên và tạo profile. |
| `PATCH` | `/api/admin/teachers/:id` | Admin | Sửa thông tin cơ bản (name, email, department, code) của giảng viên. |
| `POST` | `/api/admin/teachers/:id/reset-password` | Admin | Reset mật khẩu tài khoản giảng viên về một chuỗi mật khẩu tạm ngẫu nhiên mới. |
| `DELETE` | `/api/admin/teachers/:id` | Admin | Cấm tài khoản giảng viên hoạt động (chuyển trạng thái sang banned). |
| `GET` | `/api/admin/users` | Admin | Liệt kê và lọc danh sách tài khoản người dùng (sinh viên mặc định). |
| `PATCH` | `/api/admin/users/:id/status` | Admin | Cấm hoạt động hoặc gỡ cấm (ban/unban) tài khoản người dùng. |
| `GET` | `/api/admin/banned-keywords` | Admin | Lấy danh sách từ khóa cấm kiểm duyệt tự động trong blacklist. |
| `POST` | `/api/admin/banned-keywords` | Admin | Thêm từ khóa bị cấm (match_type: contains, exact, hoặc regex). |
| `DELETE` | `/api/admin/banned-keywords/:id` | Admin | Xóa từ khóa bị cấm khỏi danh sách đen. |
| `GET` | `/api/admin/reports` | Admin | Lấy danh sách báo cáo vi phạm nội dung chờ xử lý (phân trang). |
| `PATCH` | `/api/admin/reports/:id` | Admin | Đánh dấu báo cáo vi phạm là resolved (đã xử lý) hoặc dismissed (bác bỏ). |
| `PATCH` | `/api/admin/community/posts/:id/hide` | Admin | Ẩn bài viết diễn đàn của sinh viên (chuyển trạng thái sang hidden). |
| `PATCH` | `/api/admin/community/comments/:id/hide` | Admin | Ẩn bình luận bài viết của sinh viên (chuyển trạng thái sang hidden). |
