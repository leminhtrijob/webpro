# 📘 TÀI LIỆU QUY CHUẨN SKILL: KIẾN TRÚC MVC TIẾNG VIỆT & TỐI ƯU HÓA TRIKUN LOVE UNIVERSE

> Đồng bộ với Agent Skill tại `.agent/skills/trikun-mvc-tieng-viet/SKILL.md`. Tài liệu này dùng làm kim chỉ nam cho toàn bộ đội ngũ phát triển (Dev & AI Agent) khi làm việc trên dự án **TriKun Love Universe**.

---

## 1. Sơ Đồ Kiến Trúc MVC Tiếng Việt

```
trikun-universe/src/
├── models/                  # [MODEL] Định nghĩa kiểu dữ liệu & Schema
│   └── gift.ts              # TemplateItem, GiftConfig, CreatedGiftRecord, OrderRecord
├── data/                    # [MODEL DATA] Dữ liệu tĩnh 122 mẫu quà & nhạc nền
│   ├── availableTemplates.ts
│   └── catalogTemplates.ts
├── controllers/             # [CONTROLLER] Xử lý nghiệp vụ, bộ lọc Realtime & chuẩn hóa NFC
│   ├── TemplateController.ts # Lọc mẫu, đếm số lượng danh mục & mức giá theo thời gian thực
│   └── GiftController.ts     # Chuẩn hóa văn bản tiếng Việt NFC, xử lý cấu hình quà tặng
├── lib/                     # [CONTROLLER SERVICES] Ánh xạ 48 Engine 3D Local & Kết nối DB
│   ├── templateEngineMap.ts  # Phân phối 122 mẫu qua toàn bộ 48 Engine 3D độc lập
│   └── mongodb.ts
└── app/ & components/       # [VIEW] Giao diện người dùng (Trang chủ, Studio, Xem quà /v/[id])
```

## 2. Các Nguyên Tắc Bắt Buộc Khi Code

1. **Ưu tiên đặt tên hàm nghiệp vụ và JSDoc bằng Tiếng Việt rõ ràng** trong tầng `controllers/` (`locDanhSachMau`, `tinhSoLuongDanhMucRealtime`, `tinhSoLuongTheoGiaRealtime`, `chuanHoaVanBanTiengViet`, `chuanHoaCauHinhQuaTang`).
2. **Đếm số bộ lọc Realtime 2 chiều**:
   - Khi chọn `Tất cả` / `Miễn phí` / `Trả phí` hoặc nhập ô tìm kiếm -> Số lượng trên từng thẻ danh mục (`Tất cả`, `Tình yêu`, `Valentine`, `Sinh nhật`, v.v.) phải cập nhật ngay lập tức theo số mẫu thực tế thỏa mãn.
   - Khi chọn một danh mục bất kỳ -> Số đếm trên 3 nút `Tất cả`, `Miễn phí`, `Trả phí` cũng phải cập nhật tức thì theo danh mục đó.
3. **Chuẩn hóa Font chữ Tiếng Việt 100%**:
   - Sử dụng `Be Vietnam Pro`, `Plus Jakarta Sans`, `Lora`, `Playpen Sans`, `Dancing Script`.
   - Mọi dữ liệu văn bản người dùng nhập hoặc chọn từ gợi ý lời chúc trong Studio đều được chuẩn hóa `.normalize('NFC')`.
4. **Ghi chú nhật ký phát triển (`DEV_LOG.md`)**:
   - Mọi thay đổi tính năng, sửa lỗi template 3D hay tối ưu giao diện đều phải được cập nhật vào bảng tiến độ trong `DEV_LOG.md`.
