/**
 * @file GiftController.ts
 * @description Bộ điều khiển (Controller) xử lý chuẩn hóa dữ liệu quà tặng tiếng Việt (Unicode NFC),
 * tạo đường dẫn chia sẻ quà tặng và truy vấn cấu hình theo chuẩn MVC Tiếng Việt.
 */

import { GiftConfig } from '@/models/gift';

/**
 * Chuẩn hóa chuỗi tiếng Việt về chuẩn Unicode dựng sẵn (NFC) để không bao giờ bị lỗi tách dấu
 * trên iOS Safari, Android Chrome và Windows.
 */
export function chuanHoaVanBanTiengViet(vanBan: string | undefined | null): string {
  if (!vanBan || typeof vanBan !== 'string') return '';
  return vanBan.normalize('NFC');
}

/**
 * Chuẩn hóa toàn bộ cấu hình quà tặng (GiftConfig) về Unicode NFC trước khi hiển thị hoặc lưu DB
 */
export function chuanHoaCauHinhQuaTang(config: GiftConfig): GiftConfig {
  return {
    ...config,
    tabTitle: chuanHoaVanBanTiengViet(config.tabTitle),
    recipientName: chuanHoaVanBanTiengViet(config.recipientName),
    senderName: chuanHoaVanBanTiengViet(config.senderName),
    letterTitle: chuanHoaVanBanTiengViet(config.letterTitle),
    letterContent: chuanHoaVanBanTiengViet(config.letterContent),
    passcodeHint: chuanHoaVanBanTiengViet(config.passcodeHint),
    musicTitle: chuanHoaVanBanTiengViet(config.musicTitle)
  };
}
