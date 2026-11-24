import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getSiteSettings } from '@/lib/siteSettings';
import { SettingsModel } from '@/models/SettingsModel';

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const settings = await getSiteSettings();
  if (!settings) return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
  return NextResponse.json({ success: true, data: settings });
}

export async function PATCH(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const value = await request.json();
  if (value.bankName !== 'ACB Bank' || typeof value.accountNumber !== 'string' || !/^\d{6,24}$/.test(value.accountNumber) || typeof value.accountHolder !== 'string' || value.accountHolder.length > 100 || !value.accountHolder.trim() || typeof value.zaloPhone !== 'string' || !/^\d{9,15}$/.test(value.zaloPhone)) {
    return NextResponse.json({ success: false, message: 'Cấu hình không hợp lệ' }, { status: 400 });
  }
  if (!await getSiteSettings()) return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 503 });
  const saved = await SettingsModel.findOneAndUpdate({ key: 'main' }, {
    key: 'main', bankName: value.bankName.trim(), accountNumber: value.accountNumber,
    accountHolder: value.accountHolder.trim(), zaloPhone: value.zaloPhone
  }, { upsert: true, new: true });
  return NextResponse.json({ success: true, data: saved });
}
