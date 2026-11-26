/**
 * @file TemplateController.ts
 * @description Bộ điều khiển (Controller) quản lý nghiệp vụ tìm kiếm, lọc mẫu quà tặng 3D
 * và tính toán bộ đếm thời gian thực (Real-time Filter Counter) theo chuẩn kiến trúc MVC Tiếng Việt.
 */

import { TemplateItem } from '@/models/gift';
import { getLocalTemplateEnginePath } from '@/lib/templateEngineMap';

export const DANH_MUC_TAT_CA = 'Tất cả';

export interface DinhNghiaDanhMuc {
  key: string;
  icon: string;
}

export interface DanhMucKemSoLuong extends DinhNghiaDanhMuc {
  count: number;
  totalCount: number;
}

export interface TuyChonBoLocMau {
  danhMuc: string;
  boLocGia: 'all' | 'free' | 'paid';
  tuKhoa: string;
}

export interface ThongKeSoLuongTheoGia {
  all: number;
  free: number;
  paid: number;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt (bỏ dấu để tìm kiếm không phân biệt dấu, đồng thời chuẩn hóa NFC)
 */
export function chuanHoaChuoiTimKiem(chuoi: string): string {
  return (chuoi || '')
    .normalize('NFC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

/**
 * Kiểm tra mẫu quà có thuộc danh mục đang chọn hay không
 */
export function kiemTraKhopDanhMuc(mau: TemplateItem, danhMuc: string): boolean {
  if (!danhMuc || danhMuc === DANH_MUC_TAT_CA) return true;
  return (mau.category || '').includes(danhMuc);
}

/**
 * Kiểm tra mẫu quà có khớp bộ lọc giá (Tất cả / Miễn phí / Trả phí) hay không
 */
export function kiemTraKhopGia(mau: TemplateItem, boLocGia: 'all' | 'free' | 'paid'): boolean {
  if (boLocGia === 'all') return true;
  return !mau.sourceSite && mau.priceType === boLocGia;
}

/**
 * Kiểm tra mẫu quà có khớp từ khóa tìm kiếm đã chuẩn hóa hay không
 */
export function kiemTraKhopTuKhoa(mau: TemplateItem, tuKhoaDaChuanHoa: string): boolean {
  if (!tuKhoaDaChuanHoa) return true;
  const vanBanGop = `${mau.name} ${mau.descriptions} ${mau.category} ${(mau.tags || []).join(' ')}`;
  return chuanHoaChuoiTimKiem(vanBanGop).includes(tuKhoaDaChuanHoa);
}

/**
 * Lọc danh sách mẫu quà theo đồng thời cả 3 tiêu chí: Danh mục + Mức giá + Từ khóa
 */
export function locDanhSachMau(
  danhSachGoc: TemplateItem[],
  tuyChon: TuyChonBoLocMau
): TemplateItem[] {
  const tuKhoaChuan = chuanHoaChuoiTimKiem(tuyChon.tuKhoa);
  return danhSachGoc.filter((mau) => {
    if (!kiemTraKhopDanhMuc(mau, tuyChon.danhMuc)) return false;
    if (!kiemTraKhopGia(mau, tuyChon.boLocGia)) return false;
    if (!kiemTraKhopTuKhoa(mau, tuKhoaChuan)) return false;
    return true;
  });
}

/**
 * Tính số lượng mẫu quà theo từng danh mục theo thời gian thực (phản hồi ngay khi đổi bộ lọc giá hoặc từ khóa)
 */
export function tinhSoLuongDanhMucRealtime(
  danhSachGoc: TemplateItem[],
  danhSachDinhNghia: DinhNghiaDanhMuc[],
  tuyChon: { boLocGia: 'all' | 'free' | 'paid'; tuKhoa: string }
): DanhMucKemSoLuong[] {
  const tuKhoaChuan = chuanHoaChuoiTimKiem(tuyChon.tuKhoa);

  return danhSachDinhNghia
    .map((dm) => {
      const totalCount = danhSachGoc.filter((mau) => kiemTraKhopDanhMuc(mau, dm.key)).length;
      const count = danhSachGoc.filter(
        (mau) =>
          kiemTraKhopDanhMuc(mau, dm.key) &&
          kiemTraKhopGia(mau, tuyChon.boLocGia) &&
          kiemTraKhopTuKhoa(mau, tuKhoaChuan)
      ).length;

      return {
        ...dm,
        count,
        totalCount
      };
    })
    .filter((dm) => dm.totalCount > 0);
}

/**
 * Tính số lượng mẫu quà theo từng nhóm giá (Tất cả / Miễn phí / Trả phí) theo thời gian thực
 * dựa trên danh mục và từ khóa hiện tại.
 */
export function tinhSoLuongTheoGiaRealtime(
  danhSachGoc: TemplateItem[],
  tuyChon: { danhMuc: string; tuKhoa: string }
): ThongKeSoLuongTheoGia {
  const tuKhoaChuan = chuanHoaChuoiTimKiem(tuyChon.tuKhoa);
  const danhSachTheoDanhMucVaTuKhoa = danhSachGoc.filter(
    (mau) => kiemTraKhopDanhMuc(mau, tuyChon.danhMuc) && kiemTraKhopTuKhoa(mau, tuKhoaChuan)
  );

  let free = 0;
  let paid = 0;
  for (const mau of danhSachTheoDanhMucVaTuKhoa) {
    if (kiemTraKhopGia(mau, 'free')) free++;
    else if (kiemTraKhopGia(mau, 'paid')) paid++;
  }

  return {
    all: danhSachTheoDanhMucVaTuKhoa.length,
    free,
    paid
  };
}

/**
 * Giải quyết đường dẫn tới Engine 3D Local cho mẫu quà
 */
export function layDuongDanEngineLocal(slug: string): string {
  return getLocalTemplateEnginePath(slug);
}
