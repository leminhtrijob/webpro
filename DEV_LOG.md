# 📋 NHẬT KÝ PHÁT TRIỂN HỆ THỐNG (DEV LOG) — TRIKUN LOVE UNIVERSE

> Tài liệu này ghi lại chi tiết tiến độ phát triển theo ngày, chức năng, module MVC, các lỗi đã xử lý và trạng thái kiểm thử để lập trình viên (Dev) dễ dàng theo dõi.
> Quy chuẩn kiến trúc đi kèm: Xem [TRIKUN_MVC_SKILL.md](./TRIKUN_MVC_SKILL.md) và `.agent/skills/trikun-mvc-tieng-viet/SKILL.md`.

---

## 🗓️ BẢNG TỔNG HỢP TIẾN ĐỘ CODE THEO NGÀY & CHỨC NĂNG

| Ngày cập nhật | Phiên bản | Phân hệ (MVC Layer) | Chức năng / Hạng mục nâng cấp | Các file đã chỉnh sửa / tạo mới | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **26/11/2026** | `v3.9.0` | **Public Tracking & Interactive Guide Center** (`tra-cuu-don`, `huong-dan`, `api/orders`) | **Đồng bộ hóa Tra cứu đơn hàng & Trung tâm Hướng dẫn - FAQ Chuyên nghiệp**: <br>1. **API Orders**: Mở quyền tra cứu công khai theo mã đơn hàng (`OD...`) và số điện thoại kèm mã hóa che giấu thông tin cá nhân (`034***789`), bảo vệ danh sách tổng và doanh thu sau quyền Admin.<br>2. **Tra Cứu Đơn Quà Pro (`tra-cuu-don/page.tsx`)**: Tự động phân loại tìm kiếm theo `OD...`, `TK...`, SĐT hoặc từ khóa; hiển thị thẻ trạng thái phân màu (`completed` xanh lá, `pending` vàng cam, `cancelled` đỏ); tích hợp modal thanh toán lại VietQR và nút chat Zalo duyệt nhanh.<br>3. **Trung Tâm Hướng Dẫn & FAQ (`huong-dan/page.tsx`)**: 5 tab chuyên đề (4 bước tạo quà, Bảo mật mã PIN bàn phím số, In thiệp 10x15cm chuẩn postcard 300 DPI, Quyền lợi gói VIP 49k, Accordion FAQ giải đáp thắc mắc thường gặp). | `src/app/api/orders/route.ts`<br>`src/app/tra-cuu-don/page.tsx`<br>`src/app/huong-dan/page.tsx`<br>`DEV_LOG.md` | ✅ Hoàn tất |
| **26/11/2026** | `v3.8.5` | **Admin Visual Revamp & High-Contrast UI/UX** (`admin/page.tsx`) | **Chuẩn hóa Giao diện Admin Siêu Đẹp, Trực Quan, Đa Sắc Màu & Cực Rõ Chữ**: <br>1. **Phối màu nhận diện thao tác trực quan (Action Color Codes)**: Nút Duyệt xanh lá (`emerald`), Chat Zalo xanh dương (`blue`), Sửa đơn & quà vàng cam (`amber`/`purple`), Mở 3D hồng neon (`pink`), Xóa đỏ thắm (`rose`), Tạo mới đa sắc rực rỡ.<br>2. **Độ tương phản chữ tuyệt đối**: Chuyển toàn bộ văn bản sang `text-zinc-900`, `font-black` và `font-bold`, gỡ bỏ hoàn toàn chữ hồng mờ, chữ xám khó đọc trên nền trắng.<br>3. **Biểu tượng (Icons) đồng bộ 100%**: Bổ sung icon chi tiết cho từng cột bảng, từng nhãn trường form, từng nút thao tác và modal.<br>4. **Thông điệp & Nhãn hướng dẫn chuẩn tiếng Việt**: Mọi thao tác đều có tooltip giải thích rõ ràng, chuẩn hóa trải nghiệm người quản trị mượt mà nhất. | `src/app/admin/page.tsx`<br>`DEV_LOG.md` | ✅ Hoàn tất |
| **26/11/2026** | `v3.8.0` | **Admin Dashboard Pro & Cloud APIs** (`admin/page.tsx`, `api/gifts`, `api/orders`) | **Đại tu toàn diện Admin Dashboard Pro V3.8 — Xịn đẹp & Đủ CRUD Thông minh nhất**: <br>1. **Orders CRUD**: Thêm modal tạo & sửa chi tiết đơn hàng (khách, SĐT, số tiền, mẫu quà, trạng thái), duyệt 1-click, mở chat Zalo trực tiếp, xuất CSV tài chính chuẩn Unicode BOM cho Excel.<br>2. **Gifts CRUD**: Bổ sung API `PATCH /api/gifts`, modal sửa trực tiếp nội dung quà (thư tình, tiêu đề, mã PIN, passcode link, kích hoạt VIP), nút nhân bản quà tặng 1-click (`clone`), xuất danh sách quà sang CSV.<br>3. **Trí Tuệ & Biểu Đồ AI (Smart Insights & Charts)**: Biểu đồ xu hướng doanh thu 7 ngày qua (SVG Area Gradient Chart), bảng xếp hạng Top mẫu được tạo nhiều nhất, 3 thẻ cố vấn kinh doanh tự động phân tích đơn chờ duyệt, tỷ lệ chuyển đổi và sức khỏe 48 engine 3D.<br>4. **Thanh tìm kiếm toàn năng (Global Search)**: Tìm kiếm tức thì xuyên suốt Đơn hàng, Quà tặng, Người dùng và Mẫu web.<br>5. **Kiểm tra kết nối Live**: Nút kiểm tra Ping MongoDB Atlas thời gian thực, quản trị viên có thể giám sát độ trễ ngay trên thanh sidebar. | `src/app/admin/page.tsx`<br>`src/app/api/gifts/route.ts`<br>`src/app/api/orders/route.ts`<br>`DEV_LOG.md` | ✅ Hoàn tất |
| **26/11/2026** | `v3.7.0` | **Fullstack UI/UX & Engine Upgrades** (`ConfiguratorStudio`, `qr-tinh-yeu`, `trikun-bridge`) | **Đồng loạt nâng cấp toàn diện tính năng & Trải nghiệm người dùng (UI/UX)**: <br>1. **Studio**: Thêm kho ảnh Chibi Couple 3D (12 preset cute), upload đa ảnh cùng lúc (`multiple`), tải file ghi âm lời chúc / nhạc riêng, nút chuyển giao diện iPhone Mockup vs Desktop Wide.<br>2. **Mã QR & Thiệp in 10x15cm**: Tích hợp vẽ Canvas lồng logo trái tim nổi giữa mã QR khi tải về; bổ sung bộ tạo thiệp in 10x15cm chuẩn tiệm in 300 DPI với 3 chủ đề viền (*Sweet Pink*, *Starry Galaxy*, *Vintage Gold*).<br>3. **TriKun Universal Bridge**: Thêm nút thả chùm tim bay tương tác (`#tk-heart-burst-btn`) kèm rung haptic, và nút "Gửi lời cảm ơn qua Zalo" tự động điền sẵn tin nhắn trong hộp thư tình. | `src/components/studio/ConfiguratorStudio.tsx`<br>`src/app/qr-tinh-yeu/page.tsx`<br>`public/vendor/trikun-bridge.js`<br>`DEV_LOG.md` | ✅ Hoàn tất |
| **26/11/2026** | `v3.6.0` | **Model - View - Bridge** (`ConfiguratorStudio`, `trikun-bridge`, `lovegift-14`, `wishes.ts`) | **Khắc phục triệt để 5 vấn đề Studio & Mẫu con**: <br>1. Xóa ảnh không còn bị hiện lại (tôn trọng mảng ảnh người dùng, ngưng hồi sinh DEMO_PHOTOS).<br>2. Sửa lỗi mất chữ & lỗi font tổ hợp tách dấu trong thiệp (thay font Lora & Be Vietnam Pro, chuẩn hóa Intl.Segmenter & Unicode NFC, gỡ bỏ CARD_MAX_CHARS_PER_PARA).<br>3. Bổ sung nhãn & tooltip rõ ràng cho nút nhạc nền đỏ góc phải.<br>4. Tách biệt rõ ràng 2 loại mật khẩu: Mật khẩu mở link web và Mã PIN 4 số bàn phím trong thiệp.<br>5. Động hóa nội dung thư & gợi ý theo đúng chủ đề (20/11 Thầy Cô, Sinh nhật, 20/10 Phụ Nữ thay vì mặc định người yêu). | `src/components/studio/ConfiguratorStudio.tsx`<br>`src/components/preview/LivePreviewCanvas.tsx`<br>`src/models/gift.ts`<br>`src/models/GiftModel.ts`<br>`src/app/api/gifts/route.ts`<br>`src/data/wishes.ts`<br>`public/vendor/trikun-bridge.js`<br>`public/templates/lovegift-14/*` | ✅ Hoàn tất |
| **25/11/2026** | `v3.5.0` | **Controller & View** (`TemplateController`, `page.tsx`) | **Bộ lọc đếm số Realtime 2 chiều**: Khi bấm `Tất cả / Miễn phí / Trả phí` hoặc gõ tìm kiếm, huy hiệu số lượng trên toàn bộ 9 danh mục (`Tất cả`, `Tình yêu`, `Valentine`, `Sinh nhật`, `Trái tim 3D`, `20/11`, `Thiệp`, `Tiện ích & Game`, `Khác`) và trên 3 nút giá tự động đếm lại tức thì theo trải nghiệm người dùng. | `src/controllers/TemplateController.ts`<br>`src/app/page.tsx` | ✅ Hoàn tất |
| **25/11/2026** | `v3.5.0` | **View & Performance** (`ScrollRevealController`, `globals.css`, `ThreeHeartGalaxy`) | **Tối ưu cuộn trang Mobile & Xóa lỗi trắng trang**: Gỡ `.reveal-on-scroll` khỏi container dài `#san-pham`, hạ ngưỡng `IntersectionObserver` xuống `threshold: 0.01`, thêm `fallbackTimer` mở khóa hiển thị sau 900ms, tắt `background-attachment: fixed` trên mobile và giảm hạt WebGL Hero xuống 36 hạt trên điện thoại. | `src/components/effects/ScrollRevealController.tsx`<br>`src/app/globals.css`<br>`src/components/effects/ThreeHeartGalaxy.tsx`<br>`src/app/page.tsx` | ✅ Hoàn tất |
| **25/11/2026** | `v3.5.0` | **Controller & View** (`GiftController`, `ConfiguratorStudio`, `LivePreviewCanvas`, `layout.tsx`) | **Chuẩn hóa Font chữ Tiếng Việt & Unicode NFC**: Tải thêm font `Lora` & đầy đủ trọng số `Be Vietnam Pro`, đồng bộ `.font-sans` và `.font-serif`, sửa ô nhập `Nội dung thư` và `Gợi ý lời chúc` trong Studio không còn lỗi tách/vỡ dấu tiếng Việt (`điều`, `mắn`, `nhất`, `bền`). | `src/controllers/GiftController.ts`<br>`src/app/layout.tsx`<br>`src/app/globals.css`<br>`src/components/studio/ConfiguratorStudio.tsx`<br>`src/components/preview/LivePreviewCanvas.tsx` | ✅ Hoàn tất |
| **25/11/2026** | `v3.5.0` | **3D Engine & Routing** (`templateEngineMap.ts`, `v/[id]/page.tsx`, `trikun-bridge.js`, `public/templates/*`) | **Sửa toàn bộ 48 Engine 3D Local & Khắc phục lỗi màn hình đen / trùng mẫu**: <br>1. Sửa lỗi cú pháp `/* DisableDevtool removed */` gây màn hình đen trên `dlove-1`, `dlove-2`, `dlove-5`, `dlove-7`.<br>2. Giải mã VM Obfuscation & gỡ bỏ khóa tên miền `panbap.github.io` / `devpan.vercel.app` trên `lovez-36`, `lovez-65`, `lovez-66`, `lovez-68`.<br>3. Sửa đường dẫn RSC chunk `/_next/static/` cho các mẫu Next.js (`lovegift-3, 8, 9, 12, 16, 17`).<br>4. Khôi phục 5 module 3D Three.js cho `dlove-8`, thêm `three-r128.min.js` & bloom shim cho `lovegift-1`, tạo scene 3D cho `lovegift-3`.<br>5. Mở rộng `templateEngineMap.ts` phân phối đủ 48 Engine 3D độc lập kèm tham số `?tpl=<slug>` cá nhân hóa theo từng link mẫu. | `src/lib/templateEngineMap.ts`<br>`src/app/v/[id]/page.tsx`<br>`public/vendor/trikun-bridge.js`<br>`public/templates/dlove-*`<br>`public/templates/lovegift-*`<br>`public/templates/lovez-*`<br>`public/templates/port-galaxyz/index.html` | ✅ Hoàn tất |
| **25/11/2026** | `v3.5.0` | **Architecture & Skill** (`SKILL.md`, `TRIKUN_MVC_SKILL.md`, `DEV_LOG.md`) | **Tạo bộ quy chuẩn Markdown Skill MVC Tiếng Việt & Nhật ký Dev**: Chuẩn hóa cấu trúc `Model - View - Controller` ưu tiên Tiếng Việt, quy định rõ chuẩn font chữ, hiệu năng cuộn mobile và quy trình ghi log cho lập trình viên. | `.agent/skills/trikun-mvc-tieng-viet/SKILL.md`<br>`TRIKUN_MVC_SKILL.md`<br>`DEV_LOG.md` | ✅ Hoàn tất |
| **24/11/2026** | `v3.2.0` | **View & UI/UX** (`Header`, `FaqSection`, `HomeClosingCta`) | Đồng bộ ngôn ngữ thiết kế Pha lê Hồng Tím (`tk-home-panel`, `tk-home-card`), thu gọn Header Sticky, tối ưu form Đăng nhập/Đăng ký và chuyển FAQ xuống cuối trang chủ. | `src/components/layout/Header.tsx`<br>`src/components/home/FaqSection.tsx`<br>`src/app/globals.css` | ✅ Hoàn tất |
| **21/11/2026** | `v3.0.0` | **Model & Admin** (`mongodb.ts`, `admin/page.tsx`, `api/*`) | Kết nối chính thức Cloud MongoDB Atlas (`gifts`, `orders`), tích hợp VietQR ACB Bank (`42515647` - LÊ MINH TRÍ) và hoàn thiện Admin Dashboard Pro V2.0. | `src/lib/mongodb.ts`<br>`src/app/admin/page.tsx`<br>`src/app/api/gifts/route.ts`<br>`src/app/api/orders/route.ts` | ✅ Hoàn tất |

---

## 🔍 CHI TIẾT KỸ THUẬT CÁC HẠNG MỤC ĐÃ XỬ LÝ NGÀY 25/11/2026

### 1. Sửa lỗi cuộn trang bị trắng màn hình & load lâu trên điện thoại
- **Nguyên nhân gốc**:
  - Khối `<section id="san-pham">` chứa 12 thẻ quà tặng xếp dọc trên màn hình điện thoại có chiều cao ~4.800px nhưng lại gắn lớp `.reveal-on-scroll` (`opacity: 0`).
  - `ScrollRevealController.tsx` sử dụng `threshold: 0.12` (đòi hỏi 12% chiều cao khối = ~576px phải lọt vào khung nhìn mới kích hoạt `opacity: 1`). Khi người dùng vừa cuộn qua phần "Mẫu Được Xem Nhiều Nhất", toàn bộ vùng bên dưới bị trắng trang.
  - Ngoài ra, `body { background-attachment: fixed }` và `backdrop-filter: blur(16px)` gây nghẽn GPU khi cuộn trên iOS/Android.
- **Giải pháp đã triển khai**:
  - Gỡ `.reveal-on-scroll` khỏi thẻ bao `<section id="san-pham">`.
  - Hạ `threshold` xuống `0.01`, mở rộng `rootMargin: '140px 0px 80px 0px'` trên mobile và bổ sung `fallbackTimer` (900ms) tự động mở khóa hiển thị mọi phần tử.
  - Chuyển `background-attachment: scroll !important` trên màn hình `<= 768px`, lazy-load các ảnh phụ trên Hero và giảm mật độ hạt WebGL xuống 36 hạt trên điện thoại.

### 2. Bộ đếm số lượng mẫu Realtime theo bộ lọc
- **Nguyên nhân gốc**: Mảng `categories` trong `src/app/page.tsx` được tính cố định bằng `useMemo(..., [])`, không phụ thuộc vào `priceFilter` (`all` | `free` | `paid`) và `searchQuery`.
- **Giải pháp đã triển khai**:
  - Xây dựng `TemplateController.ts` với 2 hàm `tinhSoLuongDanhMucRealtime` và `tinhSoLuongTheoGiaRealtime`.
  - Khi chọn `Miễn phí` hoặc `Trả phí`, số đếm trên từng nút danh mục (`Tất cả`, `Valentine`, `Sinh nhật`, v.v.) cập nhật ngay lập tức khớp 100% với số lượng mẫu hiển thị bên dưới.

### 3. Sửa lỗi vỡ/tách dấu Font chữ Tiếng Việt
- **Nguyên nhân gốc**: Ô `<textarea>` nhập Nội dung thư và thẻ Gợi ý lời chúc trong `ConfiguratorStudio.tsx` sử dụng lớp `font-serif` mặc định (rơi về font hệ thống không hỗ trợ dấu tổ hợp tiếng Việt), khiến các chữ có dấu kép như `điều`, `mắn`, `nhất`, `bền` bị tách dấu.
- **Giải pháp đã triển khai**:
  - Tải font `Lora` và đầy đủ trọng số của `Be Vietnam Pro` trong `src/app/layout.tsx`.
  - Định nghĩa rõ `.font-sans` và `.font-serif` trong `src/app/globals.css`.
  - Chuyển ô nhập thư và danh sách lời chúc trong `ConfiguratorStudio.tsx` & `LivePreviewCanvas.tsx` sang `font-sans` (`Be Vietnam Pro`) kết hợp chuẩn hóa chuỗi `.normalize('NFC')` qua `GiftController.ts`.

### 4. Khắc phục triệt để lỗi màn hình đen `/v/[slug]` & lỗi nhiều link mẫu trỏ về cùng 1 mẫu
- **Nguyên nhân gốc**:
  1. `dlove-1` (mẫu `chuc-mung-20-11-1`), `dlove-2`, `dlove-5`, `dlove-7` chứa đoạn mã `return o./* DisableDevtool removed */{...}` gây lỗi cú pháp `SyntaxError: Unexpected token '{'`, làm sập toàn bộ script render 3D và để lại màn hình đen.
  2. `lovez-36`, `lovez-65`, `lovez-66`, `lovez-68` bị đóng gói bằng VM Obfuscation nặng (130KB–300KB hex array) và chứa mã khóa tên miền `if (location.hostname !== atob("cGFuYmFwLmdpdGh1Yi5pbw==")) document.body.innerHTML = "";` tự xóa trắng trang.
  3. `lovegift-8, 9, 12, 16, 17` gọi đường dẫn gốc `/_next/static/chunks/...` trong RSC payload gây lỗi `ChunkLoadError`.
  4. `templateEngineMap.ts` bỏ sót 6 thư mục `lovez-64..76` và gom 36 mẫu về chỉ 6 engine dự phòng (`fallbackPool[numId % 6]`).
- **Giải pháp đã triển khai**:
  - Đã sửa sạch lỗi cú pháp trên toàn bộ 48 mẫu trong `public/templates/*`, gỡ bỏ 100% khóa tên miền và giải mã VM Obfuscation sang JS thuần chạy siêu mượt.
  - Cập nhật `templateEngineMap.ts` ánh xạ đầy đủ 48 Engine 3D độc lập và truyền `?tpl=<slug>` sang `trikun-bridge.js` để mỗi mẫu có thông điệp, tiêu đề và màu sắc hạt riêng biệt.

---

## 🔍 CHI TIẾT KỸ THUẬT CÁC HẠNG MỤC ĐÃ XỬ LÝ NGÀY 26/11/2026

### 5. Nâng cấp Tra cứu đơn hàng thông minh, Trung tâm Hướng dẫn & FAQ Pro (v3.9.0)
- **Mở quyền tra cứu API Orders an toàn**:
  - `GET /api/orders`: Cho phép tra cứu công khai theo `?id=OD...` hoặc `?phone=...` kèm mask che số điện thoại (`034***789`) để bảo vệ quyền riêng tư của khách hàng.
  - Vẫn bảo vệ danh sách tổng toàn bộ đơn hàng và tổng doanh thu sau hàm xác thực `requireAdmin(req)`.
- **Trang Tra cứu đơn hàng (`/tra-cuu-don`)**:
  - Nhận diện thông minh loại từ khóa: `OD...` (Đơn hàng VietQR), `TK...` (Món quà máy chủ), Số điện thoại (Tất cả đơn hàng của khách), hoặc Lọc danh sách quà lưu trên trình duyệt (`localStorage`).
  - Hệ thống thẻ trạng thái phân màu chuẩn: Xanh lá (`Đã kích hoạt VIP`), Vàng cam (`Chờ duyệt thanh toán`), Đỏ thắm (`Đã hủy`).
  - Tích hợp Modal xem mã QR chuyển khoản VietQR Napas 247 kèm nút mở Zalo Trí Kun duyệt bill liền 24/7.
- **Trung tâm Hướng dẫn & FAQ (`/huong-dan`)**:
  - Hệ thống 5 tab chuyên đề: *4 Bước tạo quà 3D*, *Bảo mật & Mã PIN bàn phím số*, *In thiệp 10x15cm chuẩn 300 DPI*, *Quyền lợi gói VIP 49k*, và *Câu hỏi thường gặp (FAQ Accordion)*.
  - Giải đáp chi tiết các thắc mắc về thời hạn lưu trữ vĩnh viễn, chính sách Autoplay âm thanh trình duyệt, cách in thiệp cầm tay và hỗ trợ khách hàng.

