# TriKun Love Studio: triển khai Railway

## Mã nguồn

Ứng dụng Next.js nằm trong thư mục này. `public/templates` và các tài nguyên trong `public` là nội dung cần thiết cho trang quà. `reference-sources`, `templates` ở ngoài `public`, nhật ký và `.env.local` chỉ dùng trên máy phát triển và không đưa lên Git.

## Biến môi trường Railway

Đặt các biến sau trong dịch vụ Railway trước khi mở trang công khai:

| Biến | Mục đích |
| --- | --- |
| `MONGODB_URI` | Kết nối cơ sở dữ liệu thật. |
| `ADMIN_PASSWORD` | Mật khẩu quản trị riêng, ít nhất 12 ký tự; không dùng mật khẩu mặc định cũ. |
| `ADMIN_SESSION_SECRET` | Chuỗi ngẫu nhiên riêng, ít nhất 32 ký tự. |
| `USER_SESSION_SECRET` | Chuỗi ngẫu nhiên khác, ít nhất 32 ký tự. |
| `RESEND_API_KEY` | Gửi mã xác nhận email thật. Nếu thiếu hoặc gửi lỗi, đăng ký và khôi phục mật khẩu sẽ báo lỗi thay vì lộ mã trên trang. |
| `EMAIL_FROM` | Địa chỉ gửi email thuộc tên miền đã xác minh trong Resend. |
| `NEXT_PUBLIC_APP_URL` | URL Railway hoặc tên miền chính thức của trang. |

Đăng nhập Google chỉ hiện khi đặt cả `GOOGLE_CLIENT_ID` và `NEXT_PUBLIC_GOOGLE_CLIENT_ID` cùng một Web Client ID. Trong Google Cloud, thêm URL trang vào danh sách **Authorized JavaScript origins**. Máy chủ chỉ nhận Google ID token đã xác minh; nhập một địa chỉ email bất kỳ không tạo được phiên đăng nhập.

Các biến ngân hàng và liên hệ có trong `.env.example`; kiểm tra chúng trước khi nhận đơn thật. Không đưa khóa bí mật vào biến `NEXT_PUBLIC_*`.

## Kiểm tra

Chạy `npm ci`, `npm run build`, sau đó `npm run start -- -p 3101` để thử bản production tại máy. Trên Railway, `railway.json` dùng lệnh build và cổng `$PORT` của nền tảng. Sau khi triển khai, kiểm tra trang chủ, các mẫu quà, đăng nhập/đăng ký, quản trị, tạo quà, tra cứu đơn và tài nguyên tĩnh bằng URL Railway.
