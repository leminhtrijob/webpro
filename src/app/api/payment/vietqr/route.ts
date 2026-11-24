import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getSiteSettings } from '@/lib/siteSettings';
import { OrderModel } from '@/models/OrderModel';
import { GiftModel } from '@/models/GiftModel';
import { UserModel } from '@/models/UserModel';
import { getSessionFromRequest } from '@/lib/userAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requestKey, templateName, customerName = 'Khách hàng', customerPhone = '', orderType = 'vip_link', giftId = '' } = body;
    if (typeof requestKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey) || typeof templateName !== 'string' || !templateName.trim() || templateName.length > 255 || typeof customerName !== 'string' || customerName.length > 150 || typeof customerPhone !== 'string' || customerPhone.length > 30 || orderType !== 'vip_link' || typeof giftId !== 'string' || !/^TK[A-Z0-9]{20}$/.test(giftId)) {
      return NextResponse.json({ success: false, message: 'Thông tin đơn hàng không hợp lệ' }, { status: 400 });
    }
    if (!await connectToDatabase()) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database; không thể tạo đơn thanh toán' }, { status: 503 });
    }
    const settings = await getSiteSettings();
    if (!settings) return NextResponse.json({ success: false, message: 'Chưa có cấu hình thanh toán' }, { status: 503 });
    const gift = await GiftModel.findOne({ giftId }).select('templateName isVip ownerUserId').lean();
    if (!gift) return NextResponse.json({ success: false, message: 'Không tìm thấy quà cần nâng cấp' }, { status: 404 });
    if (gift.isVip) return NextResponse.json({ success: false, message: 'Quà này đã là VIP' }, { status: 409 });
    const session = getSessionFromRequest(req);
    const owner = session && gift.ownerUserId === session.userId
      ? await UserModel.findOne({ userId: session.userId, sessionVersion: session.sv, status: 'active' }).select('userId').lean()
      : null;
    const orderId = `OD${requestKey.replace(/-/g, '').toUpperCase()}`;
    const amount = 49000;
    const memo = `TK${requestKey.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    const order = await OrderModel.findOneAndUpdate({ orderId }, {
      $setOnInsert: {
        orderId, giftId, ...(owner ? { ownerUserId: owner.userId } : {}), templateName: gift.templateName, customerName: customerName.trim() || 'Khách hàng',
        customerPhone, orderType, amount, status: 'pending', paymentMethod: 'VietQR_ACB', note: `Mã CK: ${memo}`
      }
    }, { upsert: true, new: true });
    if (order.giftId !== giftId || order.orderType !== orderType || order.amount !== amount) {
      return NextResponse.json({ success: false, message: 'Mã yêu cầu đã thuộc đơn hàng khác' }, { status: 409 });
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ success: false, message: 'Đơn này đã được xử lý' }, { status: 409 });
    }
    const qrUrl = `https://img.vietqr.io/image/ACB-${settings.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(settings.accountHolder)}`;
    return NextResponse.json({ success: true, data: {
      orderId, bankName: settings.bankName, accountNumber: settings.accountNumber,
      accountHolder: settings.accountHolder, zaloPhone: settings.zaloPhone,
      amount, memo, qrUrl, status: 'pending'
    } });
  } catch (error) {
    console.error('Lỗi tạo đơn VietQR:', error);
    return NextResponse.json({ success: false, message: 'Không thể tạo đơn VietQR' }, { status: 500 });
  }
}
