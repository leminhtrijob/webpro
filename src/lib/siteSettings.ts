import { connectToDatabase } from '@/lib/mongodb';
import { SettingsModel, SiteSettings } from '@/models/SettingsModel';

export const DEFAULT_SETTINGS: SiteSettings = {
  bankName: process.env.BANK_NAME || 'ACB Bank',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '42515647',
  accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'LE MINH TRI',
  zaloPhone: process.env.ZALO_PHONE || '0345151438'
};

export async function getSiteSettings(): Promise<SiteSettings | null> {
  if (!await connectToDatabase()) return null;
  const saved = await SettingsModel.findOne({ key: 'main' }).lean() as SiteSettings | null;
  return saved ? {
    bankName: saved.bankName,
    accountNumber: saved.accountNumber,
    accountHolder: saved.accountHolder,
    zaloPhone: saved.zaloPhone
  } : DEFAULT_SETTINGS;
}
