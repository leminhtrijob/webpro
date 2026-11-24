-- ====================================================================
-- CƠ SỞ DỮ LIỆU MYSQL - HỆ THỐNG VŨ TRỤ QUÀ TẶNG TRIKUN UNIVERSE 2026
-- Thiết kế: Chuẩn Clean Code & MVC - Quản lý 100% tài nguyên độc lập
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `trikun_universe` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `trikun_universe`;

-- 1. BẢNG TEMPLATES (Quản lý các mẫu web quà tặng 3D / Thiệp / Trái tim)
CREATE TABLE IF NOT EXISTS `templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(150) NOT NULL UNIQUE COMMENT 'Đường dẫn định danh mẫu (ví dụ: myheart-7)',
  `name` VARCHAR(255) NOT NULL COMMENT 'Tên mẫu web quà tặng',
  `category` VARCHAR(100) NOT NULL DEFAULT 'Tình yêu' COMMENT 'Danh mục: Valentine, Sinh nhật, 20/11, 8/3...',
  `image` VARCHAR(255) NOT NULL COMMENT 'Đường dẫn ảnh cục bộ nội bộ (/images/templates/...)',
  `descriptions` TEXT COMMENT 'Mô tả chi tiết mẫu quà',
  `price_text` VARCHAR(50) DEFAULT 'Miễn phí' COMMENT 'Chuỗi giá hiển thị',
  `price_type` ENUM('free', 'paid') DEFAULT 'free' COMMENT 'Loại: miễn phí hoặc có phí',
  `author` VARCHAR(100) DEFAULT 'Trí Kun Studio' COMMENT 'Tác giả phát triển',
  `views` INT DEFAULT 0 COMMENT 'Số lượt xem / tạo',
  `likes` INT DEFAULT 0 COMMENT 'Số lượt yêu thích',
  `is_hot` BOOLEAN DEFAULT FALSE COMMENT 'Gắn nhãn HOT nổi bật',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`),
  INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG GIFTS (Lưu trữ các món quà khách hàng đã tạo để sinh link máy chủ thật vĩnh viễn)
CREATE TABLE IF NOT EXISTS `gifts` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY COMMENT 'Mã quà tặng định danh duy nhất (ví dụ: TK-LOVE-1234)',
  `template_slug` VARCHAR(150) NOT NULL COMMENT 'Mã template sử dụng',
  `template_name` VARCHAR(255) NOT NULL COMMENT 'Tên mẫu quà',
  `recipient_name` VARCHAR(100) NOT NULL COMMENT 'Tên người nhận (ví dụ: Bé Uyên)',
  `sender_name` VARCHAR(100) NOT NULL COMMENT 'Tên người gửi (ví dụ: Trí Kun)',
  `letter_title` VARCHAR(255) DEFAULT 'Lá Thư Gửi Em',
  `letter_content` TEXT COMMENT 'Nội dung thư tình cảm',
  `music_url` VARCHAR(255) DEFAULT '/audio/leduong.mp3' COMMENT 'Đường dẫn nhạc cục bộ',
  `passcode` VARCHAR(50) DEFAULT NULL COMMENT 'Mật khẩu mở khóa (nếu có)',
  `passcode_hint` VARCHAR(255) DEFAULT NULL COMMENT 'Gợi ý mật khẩu',
  `particle_color` VARCHAR(20) DEFAULT '#FF4F86',
  `particle_count` INT DEFAULT 180,
  `config_json` LONGTEXT NOT NULL COMMENT 'Toàn bộ cấu hình quà tặng chi tiết dạng JSON',
  `is_vip` BOOLEAN DEFAULT FALSE COMMENT 'Đã kích hoạt gói VIP vĩnh viễn không logo',
  `views_count` INT DEFAULT 0 COMMENT 'Số lần người nhận mở xem',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_template_slug` (`template_slug`),
  INDEX `idx_recipient_name` (`recipient_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG ORDERS (Quản lý đơn mua Source Code & Gói VIP thanh toán qua VietQR ACB)
CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` VARCHAR(50) NOT NULL PRIMARY KEY COMMENT 'Mã đơn thanh toán (ví dụ: TK89213)',
  `gift_id` VARCHAR(100) DEFAULT NULL COMMENT 'Mã quà tặng liên kết',
  `template_name` VARCHAR(255) NOT NULL,
  `customer_name` VARCHAR(150) DEFAULT 'Khách hàng',
  `customer_phone` VARCHAR(30) DEFAULT NULL COMMENT 'Số điện thoại Zalo của khách',
  `order_type` ENUM('vip_link', 'buy_source', 'custom_service') NOT NULL DEFAULT 'vip_link',
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 49000.00 COMMENT 'Số tiền thanh toán',
  `status` ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending' COMMENT 'Trạng thái đơn hàng',
  `payment_method` VARCHAR(50) DEFAULT 'VietQR_ACB',
  `note` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG SETTINGS (Cấu hình hệ thống, số tài khoản ACB Bank và Hotline Zalo Trí Kun)
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. DỮ LIỆU CẤU HÌNH MẪU BAN ĐẦU
INSERT INTO `settings` (`setting_key`, `setting_value`, `description`) VALUES
('bank_name', 'ACB Bank', 'Ngân hàng nhận thanh toán'),
('bank_account_number', '42515647', 'Số tài khoản ngân hàng của Trí Kun'),
('bank_account_holder', 'LE MINH TRI', 'Tên chủ tài khoản'),
('zalo_phone', '0345151438', 'Số điện thoại Zalo hỗ trợ khách'),
('facebook_url', 'https://facebook.com/trikun', 'Đường dẫn Facebook cá nhân Trí Kun'),
('store_title', 'TriKun Love Studio', 'Tên thương hiệu cửa hàng')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;
