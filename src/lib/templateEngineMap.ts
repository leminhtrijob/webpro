/**
 * Bản đồ ánh xạ 100% các mẫu quà tặng (slug / id) trên TriKun Love Studio
 * tới đúng bộ engine HTML/CSS/JS đã được build và lưu trữ chạy hoàn toàn tại Local (`public/templates/...`).
 * Đảm bảo khớp 100% với ảnh động xem trước (thumbnail) của từng card trên trang chủ.
 */

const DIRECT_TEMPLATE_FOLDERS = new Set([
  '3d-webgl',
  'secret-letter',
  'flower-bouquet',
  'romantic-simple',
  'port-firework',
  'port-galaxyz',
  'port-merrytree3d',
  'lovez-36',
  'lovez-51',
  'lovez-57',
  'lovez-61',
  'lovez-90',
  'lovegift-1',
  'lovegift-2',
  'lovegift-3',
  'lovegift-4',
  'lovegift-5',
  'lovegift-6',
  'lovegift-7',
  'lovegift-8',
  'lovegift-9',
  'lovegift-10',
  'lovegift-11',
  'lovegift-12',
  'lovegift-13',
  'lovegift-14',
  'lovegift-15',
  'lovegift-16',
  'lovegift-17',
  'lovegift-18',
  'lovegift-19',
  'dlove-1',
  'dlove-2',
  'dlove-3',
  'dlove-4',
  'dlove-5',
  'dlove-6',
  'dlove-7',
  'dlove-8',
  'dlove-9',
  'dlove-10',
  'dlove-11'
]);

/**
 * Trả về đường dẫn file HTML local chạy trực tiếp cho bất kỳ template slug nào
 */
export function getLocalTemplateEnginePath(slug: string): string {
  const s = (slug || '').trim().toLowerCase();

  // 1. Nếu trùng tên thư mục gift engine đã build trong public/templates/
  if (DIRECT_TEMPLATE_FOLDERS.has(s)) {
    return `/templates/${s}/index.html`;
  }

  // 2. Ánh xạ chính xác từng ID card trên trang chủ (1..91) khớp với hình ảnh preview của card
  const idMatch = s.match(/(?:^|-)(\d+)$/);
  const numId = idMatch ? Number(idMatch[1]) : 0;

  if (!s.startsWith('dlove-') && !s.startsWith('lovegift-')) {
    if (numId === 1) return '/templates/dlove-1/index.html'; // Chúc mừng 20-11 (Bó hoa 3D & Thiệp mở)
    if (numId === 2) return '/templates/lovegift-14/index.html'; // Chúc mừng ngày 20-11 (Phong bì mở thư & Trái tim)
    if (numId === 3) return '/templates/lovegift-15/index.html'; // Happy Birthday 3D (Bánh sinh nhật 3D thổi nến)
    if (numId === 4) return '/templates/dlove-4/index.html'; // Valentine ("Chào Em [Tiếp]" 3D)
    if (numId === 5) return '/templates/lovegift-11/index.html'; // Happy Birthday ("Vui vẻ" Matrix hạt chữ + Ảnh kỷ niệm)
    if (numId === 6) return '/templates/port-galaxyz/index.html'; // Galaxylove (Hình ảnh xoay quanh tinh cầu 3D)
    if (numId === 7) return '/templates/lovegift-6/index.html'; // Myheart (Trái tim hạt 3D kèm thẻ thư treo bên dưới)
    if (numId === 8) return '/templates/lovegift-7/index.html'; // Deartext (Chữ & ảnh kỷ niệm 3D rơi trong không gian)
    if (numId === 9) return '/templates/lovegift-13/index.html'; // Bó hoa tặng bạn (Bó hoa Tulip 20/10 & Chibi)
    if (numId === 10) return '/templates/lovegift-4/index.html'; // Bó hoa yêu thương (Bó hoa Tulip nền hồng pastel)
    if (numId === 11) return '/templates/lovegift-2/index.html'; // Valentine2 (Vòng xoay bức tường ảnh 3D)
    if (numId === 12) return '/templates/lovegift-16/index.html'; // Valentine3
    if (numId === 13) return '/templates/lovegift-1/index.html'; // Textlove (Ngàn lời yêu hóa trái tim)
    if (numId === 14) return '/templates/lovegift-5/index.html'; // Textlove2 (Mưa lời yêu & ảnh 3D)
    if (numId === 15) return '/templates/dlove-2/index.html'; // Textlove3 (Không gian mưa chữ & ảnh 3D)
    if (numId === 16) return '/templates/dlove-6/index.html'; // Lời nhắn yêu thương
    if (numId === 17 || numId === 18 || numId === 19) return '/templates/lovegift-10/index.html';
    if (numId === 20) return '/templates/3d-webgl/index.html'; // Loveheart
    if (numId === 21) return '/templates/dlove-8/index.html'; // Loveheart2 (Hình ảnh xoay quanh trái tim)
    if (numId === 22) return '/templates/dlove-3/index.html'; // Loveheart3
    if (numId >= 23 && numId <= 26) return '/templates/port-merrytree3d/index.html'; // Merry Christmas Tree 3D
    if (numId === 27 || numId === 28 || numId === 61) return '/templates/port-firework/index.html'; // Pháo hoa Năm Mới
    if (numId === 29) return '/templates/lovegift-3/index.html'; // Countdown 2027
    if (numId === 30) return '/templates/dlove-5/index.html'; // Bó hoa tặng bạn 2 (Vườn hoa 3D)
    if (numId === 31) return '/templates/flower-bouquet/index.html'; // Gắp ảnh / Ghép ảnh bó hoa
    if (numId >= 32 && numId <= 35) return '/templates/lovegift-18/index.html'; // Đếm ngày yêu & Khóa tình yêu
    if (numId === 36 || numId === 37) return '/templates/lovez-36/index.html'; // Trung thu 3D
    if (numId === 38 || numId === 39) return '/templates/dlove-9/index.html'; // Trung thu lồng đèn & mưa chữ 3D
    if (numId === 49) return '/templates/dlove-10/index.html'; // Tri ân thầy cô 20/11
    if (numId === 51 || numId === 52) return '/templates/lovez-51/index.html'; // Thiệp Merry Christmas
    if (numId === 53) return '/templates/lovegift-17/index.html'; // Women's Day (Vườn hoa nở 3D)
    if (numId === 54 || numId === 55) return '/templates/lovegift-19/index.html'; // Tỏ tình crush / Treelove
    if (numId === 56) return '/templates/lovegift-8/index.html'; // Happy Birthday 2
    if (numId === 57) return '/templates/lovez-57/index.html'; // Happy Birthday 3
    if (numId === 58 || numId === 59 || numId === 60) return '/templates/dlove-7/index.html'; // Skywish / Skystar Galaxy
    if (numId === 62 || numId === 63) return '/templates/lovegift-6/index.html'; // Withlove / Heart 3D
    if (numId === 90) return '/templates/lovez-90/index.html'; // Game Kéo Búa Bao
  }

  // 3. Phân loại thông minh theo từ khóa trong slug cho các mẫu còn lại
  if (s.includes('20-11') || s.includes('nha-giao') || s.includes('thay-co')) {
    return numId % 2 === 0 ? '/templates/dlove-10/index.html' : '/templates/dlove-1/index.html';
  }
  if (s.includes('galaxy') || s.includes('tinh-cau') || s.includes('thien-ha') || s.includes('planet') || s.includes('sky')) {
    return numId % 2 === 0 ? '/templates/port-galaxyz/index.html' : '/templates/dlove-8/index.html';
  }
  if (s.includes('firework') || s.includes('phao-hoa') || s.includes('nam-moi') || s.includes('tet')) {
    return '/templates/port-firework/index.html';
  }
  if (s.includes('christmas') || s.includes('noel') || s.includes('giang-sinh') || s.includes('merry') || s.includes('tree')) {
    return numId % 2 === 0 ? '/templates/port-merrytree3d/index.html' : '/templates/lovez-51/index.html';
  }
  if (s.includes('trung-thu')) {
    return numId % 2 === 0 ? '/templates/lovez-36/index.html' : '/templates/dlove-9/index.html';
  }
  if (s.includes('sinh-nhat') || s.includes('birthday')) {
    const bdayEngines = [
      '/templates/lovegift-11/index.html',
      '/templates/lovegift-12/index.html',
      '/templates/lovegift-15/index.html',
      '/templates/lovez-57/index.html',
      '/templates/dlove-11/index.html'
    ];
    return bdayEngines[numId % bdayEngines.length];
  }
  if (s.includes('bo-hoa') || s.includes('flower') || s.includes('hoa') || s.includes('20-10') || s.includes('8-3')) {
    const flowerEngines = [
      '/templates/lovegift-13/index.html',
      '/templates/lovegift-4/index.html',
      '/templates/lovegift-17/index.html',
      '/templates/dlove-1/index.html',
      '/templates/flower-bouquet/index.html'
    ];
    return flowerEngines[numId % flowerEngines.length];
  }
  if (s.includes('thu') || s.includes('letter') || s.includes('lock') || s.includes('moc-khoa')) {
    return numId % 2 === 0 ? '/templates/secret-letter/index.html' : '/templates/lovegift-14/index.html';
  }
  if (s.includes('text') || s.includes('mua-loi') || s.includes('rain')) {
    return numId % 2 === 0 ? '/templates/lovegift-7/index.html' : '/templates/lovegift-5/index.html';
  }
  if (s.includes('valentine')) {
    return numId % 2 === 0 ? '/templates/dlove-4/index.html' : '/templates/lovegift-2/index.html';
  }
  if (s.includes('simple') || s.includes('2d')) {
    return '/templates/romantic-simple/index.html';
  }

  // Mặc định: Luân phiên giữa các mẫu 3D WebGL đẹp nhất
  const fallbackPool = [
    '/templates/3d-webgl/index.html',
    '/templates/lovegift-6/index.html',
    '/templates/lovegift-7/index.html',
    '/templates/port-galaxyz/index.html',
    '/templates/dlove-1/index.html',
    '/templates/lovegift-13/index.html'
  ];
  return fallbackPool[numId % fallbackPool.length];
}
