import LZString from 'lz-string';
import { GiftConfig } from '@/models/gift';

/**
 * Nén cấu hình quà tặng thành chuỗi URL-safe cực ngắn
 */
export function compressGiftConfig(config: GiftConfig): string {
  try {
    const jsonStr = JSON.stringify(config);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (err) {
    console.error('Error compressing gift config:', err);
    return Buffer.from(JSON.stringify(config)).toString('base64');
  }
}

/**
 * Giải nén chuỗi URL thành cấu hình quà tặng
 */
export function decompressGiftConfig(compressed: string): GiftConfig | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (decompressed) {
      return JSON.parse(decompressed);
    }
    // Fallback base64
    const json = Buffer.from(compressed, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (err) {
    console.error('Error decompressing gift config:', err);
    return null;
  }
}
