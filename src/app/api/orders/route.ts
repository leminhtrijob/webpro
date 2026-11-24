import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { OrderModel } from '@/models/OrderModel';
import { requireAdmin } from '@/lib/adminAuth';
import { GiftModel } from '@/models/GiftModel';

// GET /api/orders - Lấy danh sách đơn hàng từ MongoDB Atlas
export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');
    const phone = searchParams.get('phone');

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    if (orderId) {
      const order = await OrderModel.findOne({ orderId }).lean();
      return NextResponse.json({ success: true, data: order });
    }

    if (phone) {
      const orders = await OrderModel.find({ customerPhone: phone }).sort({ createdAt: -1 }).lean();
      return NextResponse.json({ success: true, data: orders });
    }

    // Admin lấy 100 đơn hàng mới nhất
    const orders = await OrderModel.find({}).sort({ createdAt: -1 }).limit(100).lean();
    const totalRevenue = await OrderModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      revenue: totalRevenue[0]?.total || 0,
      totalCount: await OrderModel.countDocuments()
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi tải đơn hàng' }, { status: 500 });
  }
}

// POST /api/orders - Tạo đơn hàng mới
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    if (!Number.isSafeInteger(body.amount) || body.amount < 0 || !['vip_link', 'buy_source', 'custom_service'].includes(body.orderType || 'vip_link') || !['pending', 'completed', 'cancelled'].includes(body.status || 'pending')) {
      return NextResponse.json({ success: false, message: 'Dữ liệu đơn hàng không hợp lệ' }, { status: 400 });
    }
    const orderId = `OD${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    const newOrder = await OrderModel.create({
      orderId,
      giftId: body.giftId,
      templateName: body.templateName || 'Vũ trụ tình yêu',
      customerName: body.customerName || 'Khách hàng',
      customerPhone: body.customerPhone || '',
      orderType: body.orderType || 'vip_link',
      amount: body.amount,
      status: body.status ?? 'pending',
      paymentMethod: body.paymentMethod || 'VietQR_ACB',
      note: body.note || ''
    });

    return NextResponse.json({ success: true, data: newOrder });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi tạo đơn hàng' }, { status: 500 });
  }
}

// PATCH /api/orders - Cập nhật trạng thái đơn (duyệt thanh toán)
export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { orderId, status } = body;
    if (typeof orderId !== 'string' || !['pending', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    const existing = await OrderModel.findOne({ orderId });
    if (!existing) return NextResponse.json({ success: false, message: 'Không tìm thấy đơn' }, { status: 404 });
    if (existing.status === 'completed' && status !== 'completed') {
      return NextResponse.json({ success: false, message: 'Đơn đã hoàn tất, không thể đổi ngược trạng thái' }, { status: 409 });
    }
    let updated;
    if (status === 'completed' && existing.orderType === 'vip_link' && existing.giftId) {
      await db.connection.transaction(async (session) => {
        const giftResult = await GiftModel.updateOne({ giftId: existing.giftId }, { $set: { isVip: true } }, { session });
        if (giftResult.matchedCount !== 1) throw new Error('Không tìm thấy quà liên kết đơn VIP');
        updated = await OrderModel.findOneAndUpdate({ orderId }, { status }, { new: true, session });
      });
    } else {
      updated = await OrderModel.findOneAndUpdate({ orderId }, { status }, { new: true });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi cập nhật đơn hàng' }, { status: 500 });
  }
}

// DELETE /api/orders - Xóa đơn hàng
export async function DELETE(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Thiếu mã orderId' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    const existing = await OrderModel.findOne({ orderId });
    if (!existing) return NextResponse.json({ success: false, message: 'Không tìm thấy đơn' }, { status: 404 });
    if (existing.status === 'completed') return NextResponse.json({ success: false, message: 'Không xóa đơn đã hoàn tất' }, { status: 409 });
    await OrderModel.deleteOne({ orderId });
    return NextResponse.json({ success: true, message: 'Đã xóa đơn hàng thành công' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi xóa đơn hàng' }, { status: 500 });
  }
}
