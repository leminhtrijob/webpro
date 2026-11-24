import mongoose, { Schema, Document, Model } from 'mongoose';

export type OtpPurpose = 'register' | 'reset_password';

export interface IOtpDocument extends Document {
  email: string;
  purpose: OtpPurpose;
  otpHash: string;
  otpSalt: string;
  attempts: number;
  maxAttempts: number;
  pendingData?: {
    fullName?: string;
    phone?: string;
    passwordHash?: string;
    passwordSalt?: string;
  };
  expiresAt: Date;
  lastSentAt: Date;
  createdAt: Date;
}

const OtpSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    purpose: {
      type: String,
      enum: ['register', 'reset_password'],
      required: true,
      index: true
    },
    otpHash: { type: String, required: true },
    otpSalt: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    pendingData: {
      fullName: { type: String },
      phone: { type: String },
      passwordHash: { type: String },
      passwordSalt: { type: String }
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Tự động xóa bản ghi hết hạn trên MongoDB
    },
    lastSentAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

export const OtpModel: Model<IOtpDocument> =
  mongoose.models.Otp || mongoose.model<IOtpDocument>('Otp', OtpSchema);
