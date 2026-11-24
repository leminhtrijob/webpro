import mongoose, { Schema } from 'mongoose';

export interface SiteSettings {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  zaloPhone: string;
}

const SettingsSchema = new Schema({
  key: { type: String, required: true, unique: true },
  bankName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  accountHolder: { type: String, required: true },
  zaloPhone: { type: String, required: true }
}, { timestamps: true });

export const SettingsModel = mongoose.models.SiteSettings || mongoose.model('SiteSettings', SettingsSchema);
