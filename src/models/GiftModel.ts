import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGiftDocument extends Document {
  giftId: string;
  ownerUserId?: string;
  templateSlug: string;
  templateName: string;
  recipientName: string;
  senderName: string;
  particlesEnabled: boolean;
  particleColor: string;
  particleCount: number;
  particleType: string;
  images: string[];
  showSphere3D: boolean;
  letterEnabled: boolean;
  letterTitle: string;
  letterContent: string;
  showLetterPhoto: boolean;
  musicId: string;
  musicTitle: string;
  musicUrl: string;
  autoPlay: boolean;
  passcodeEnabled: boolean;
  passcode?: string;
  passcodeHint?: string;
  keypadPinEnabled?: boolean;
  keypadPin?: string;
  keypadPinHint?: string;
  themeColor: string;
  tabTitle: string;
  isVip: boolean;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const GiftSchema: Schema = new Schema(
  {
    giftId: { type: String, required: true, unique: true, index: true },
    ownerUserId: { type: String, index: true },
    templateSlug: { type: String, required: true, index: true },
    templateName: { type: String, required: true },
    recipientName: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    particlesEnabled: { type: Boolean, default: true },
    particleColor: { type: String, default: '#FF4F86' },
    particleCount: { type: Number, default: 180 },
    particleType: { type: String, default: 'heart' },
    images: { type: [String], default: [] },
    showSphere3D: { type: Boolean, default: true },
    letterEnabled: { type: Boolean, default: true },
    letterTitle: { type: String, default: 'Lá Thư Tình Yêu' },
    letterContent: { type: String, default: '' },
    showLetterPhoto: { type: Boolean, default: true },
    musicId: { type: String, default: 'm1' },
    musicTitle: { type: String, default: 'Nhạc nền TriKun' },
    musicUrl: { type: String, default: '/audio/trikun-theme.wav' },
    autoPlay: { type: Boolean, default: true },
    passcodeEnabled: { type: Boolean, default: false },
    passcode: { type: String, default: '' },
    passcodeHint: { type: String, default: '' },
    keypadPinEnabled: { type: Boolean, default: true },
    keypadPin: { type: String, default: '1402' },
    keypadPinHint: { type: String, default: '' },
    themeColor: { type: String, default: '#FF4F86' },
    tabTitle: { type: String, default: 'Quà Tặng Tình Yêu' },
    isVip: { type: Boolean, default: false },
    viewsCount: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

export const GiftModel: Model<IGiftDocument> =
  mongoose.models.Gift || mongoose.model<IGiftDocument>('Gift', GiftSchema);
