export interface TemplateItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  image: string;
  descriptions: string;
  priceText: string;
  priceType: 'free' | 'paid';
  author: string;
  views: number;
  likes: number;
  isHot?: boolean;
  tags?: string[];
  sourceSite?: 'lovez22' | 'dlove' | 'lovegift';
  sourceId?: string;
  sourceEditorUrl?: string;
  sourcePreviewUrl?: string;
  sourceStatus?: 'public-html' | 'login' | 'missing' | 'offline';
}

export interface GiftConfig {
  id?: string;
  templateSlug: string;
  templateName: string;
  recipientName: string;
  senderName: string;
  
  // 1. Hiệu ứng hạt
  particlesEnabled: boolean;
  particleColor: string; // hex
  particleCount: number;
  particleType: 'heart' | 'galaxy' | 'stars' | 'fireworks';

  // 2. Ảnh
  images: string[]; // URLs or base64
  showSphere3D: boolean;

  // 3. Thư
  letterEnabled: boolean;
  letterTitle: string;
  letterContent: string;
  letterDate?: string;
  showLetterPhoto: boolean;

  // 4. Nhạc nền
  musicId: string;
  musicTitle: string;
  musicUrl: string;
  autoPlay: boolean;

  // 5. Màn hình mật khẩu
  passcodeEnabled: boolean;
  passcode: string;
  passcodeHint: string;

  // 6. Tùy chỉnh nâng cao
  themeColor: string;
  tabTitle: string;
  createdDate?: string;
  isVip?: boolean;
}

export interface OrderItem {
  orderId: string;
  giftId: string;
  templateName: string;
  customerPhone: string;
  customerName: string;
  type: 'vip_link' | 'buy_source' | 'custom_service';
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}
