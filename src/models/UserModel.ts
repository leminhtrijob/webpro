import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'user' | 'vip' | 'admin';
export type UserStatus = 'active' | 'locked';
export type AuthProvider = 'local' | 'google';

export interface IUserDocument extends Document {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  avatar: string;
  bio: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  status: UserStatus;
  authProvider: AuthProvider;
  googleId?: string;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date | null;
  sessionVersion: number;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true, index: true },
    avatar: { type: String, default: '/images/hero/chibi_1.jpg' },
    bio: { type: String, default: 'Thành viên Vũ Trụ Quà Tặng Số TriKun Love 💖' },
    passwordHash: { type: String, default: '' },
    passwordSalt: { type: String, default: '' },
    role: {
      type: String,
      enum: ['user', 'vip', 'admin'],
      default: 'user',
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'locked'],
      default: 'active',
      index: true
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    googleId: { type: String, default: '' },
    emailVerified: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
