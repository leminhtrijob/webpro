import type { TemplateItem } from '@/models/gift';
import { TEMPLATES_DATA } from './templates';
import { REFERENCE_CATALOG } from './referenceCatalog';

/**
 * Danh sách toàn bộ 122 mẫu quà tặng số hoạt động 100% tại Local trên TriKun Love Studio.
 * Tất cả các mẫu đều có trình chỉnh sửa (/studio/[slug]) và trang hiển thị quà (/v/[slug])
 * sử dụng trực tiếp engine HTML/CSS/JS local trong `public/templates/`.
 */
const CORE_TRIKUN_TEMPLATE: TemplateItem = {
  id: 1000,
  slug: 'trikun-heart',
  name: 'Vũ Trụ Trái Tim 3D TriKun',
  category: 'Trái tim 3D',
  image: '/images/trikun-heart-preview.png',
  descriptions: 'Tùy chỉnh tên người thương, lời chúc, quả cầu ảnh 3D, nhạc nền và mật khẩu mở quà.',
  priceText: 'Miễn phí',
  priceType: 'free',
  author: 'TriKun Studio',
  views: 9850,
  likes: 1420,
  isHot: true,
  tags: ['Trái tim 3D', 'Quà tặng số', 'WebGL']
};

const LOVEZ_ACTIVE_TEMPLATES: TemplateItem[] = TEMPLATES_DATA.map((item) => ({
  ...item,
  priceText: item.priceType === 'free' ? 'Miễn phí' : '49.000đ',
  author: 'TriKun Studio',
  sourceSite: undefined,
  sourceId: undefined,
  sourceEditorUrl: undefined,
  sourcePreviewUrl: undefined,
  sourceStatus: undefined
}));

const EXTRA_CAPTURED_TEMPLATES: TemplateItem[] = REFERENCE_CATALOG.map((ref, idx) => {
  const isFree = !ref.price || ref.price === 0;
  const is2011 = /20\/11|20-11|nhà giáo/i.test(`${ref.name} ${ref.description}`);
  const isBday = /sinh nhật|birthday/i.test(`${ref.name} ${ref.description}`);
  const isHeart = /trái tim|heart/i.test(`${ref.name} ${ref.description}`);
  const isVal = /valentine|tỏ tình/i.test(`${ref.name} ${ref.description}`);

  let category = 'Tình yêu';
  if (is2011) category = 'Ngày Nhà Giáo 20/11';
  else if (isBday) category = 'Sinh nhật';
  else if (isHeart) category = 'Trái tim 3D';
  else if (isVal) category = 'Valentine';
  else if (ref.source === 'LoveGift') category = 'Thiệp';

  return {
    id: 2000 + idx,
    slug: ref.id, // e.g. dlove-1..11, lovegift-1..19
    name: ref.name,
    category,
    image: ref.image || '/images/templates/tpl_7.gif',
    descriptions: ref.description || 'Mẫu quà tặng 3D tương tác chạy trực tiếp trên TriKun Love Studio.',
    priceText: isFree ? 'Miễn phí' : `${ref.price?.toLocaleString('vi-VN')}đ`,
    priceType: isFree ? 'free' : 'paid',
    author: 'TriKun Studio',
    views: 2400 + idx * 135,
    likes: 320 + idx * 24,
    isHot: idx < 6,
    tags: [category, 'Quà tặng 3D', 'TriKun Studio']
  };
});

export const AVAILABLE_TEMPLATES: TemplateItem[] = [
  CORE_TRIKUN_TEMPLATE,
  ...LOVEZ_ACTIVE_TEMPLATES,
  ...EXTRA_CAPTURED_TEMPLATES
];
