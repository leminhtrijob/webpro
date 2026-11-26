import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { OrderModel } from '@/models/OrderModel';
import { requireAdmin } from '@/lib/adminAuth';
import { GiftModel } from '@/models/GiftModel';

// GET /api/orders - Lấy danh sách hoặc tra cứu đơn hàng từ MongoDB Atlas
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');
    const phone = searchParams.get('phone');

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    // 1. Cho phép khách hàng tra cứu công khai đơn hàng theo mã đơn (OD...)
    if (orderId) {
      const order = await OrderModel.findOne({ orderId }).lean();
      if (!order) {
        return NextResponse.json({ success: false, message: 'Không tìm thấy đơn hàng với mã này' }, { status: 404 });
      }
      const maskedPhone = order.customerPhone
        ? order.customerPhone.replace(/(\d{3})\d+(\d{3})/, '$1***$2')
        : '';
      return NextResponse.json({
        success: true,
        data: {
          orderId: order.orderId,
          giftId: order.giftId,
          templateName: order.templateName,
          customerName: order.customerName,
          customerPhone: maskedPhone,
          orderType: order.orderType,
          amount: order.amount,
          status: order.status,
          paymentMethod: order.paymentMethod,
          note: order.note,
          createdAt: order.createdAt
        }
      });
    }

    // 2. Cho phép khách hàng tra cứu danh sách đơn hàng theo số điện thoại
    if (phone) {
      const cleanPhone = phone.trim();
      if (!/^[0-9+ ]{9,15}$/.test(cleanPhone)) {
        return NextResponse.json({ success: false, message: 'Số điện thoại không hợp lệ' }, { status: 400 });
      }
      const orders = await OrderModel.find({ customerPhone: cleanPhone }).sort({ createdAt: -1 }).limit(30).lean();
      const sanitized = orders.map((o) => ({
        orderId: o.orderId,
        giftId: o.giftId,
        templateName: o.templateName,
        customerName: o.customerName,
        customerPhone: o.customerPhone ? o.customerPhone.replace(/(\d{3})\d+(\d{3})/, '$1***$2') : '',
        orderType: o.orderType,
        amount: o.amount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        note: o.note,
        createdAt: o.createdAt
      }));
      return NextResponse.json({ success: true, data: sanitized });
    }

    // 3. Nếu không có id hoặc phone -> Bắt buộc phiên quyền Quản trị viên Admin
    const denied = requireAdmin(req);
    if (denied) return denied;

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

// PATCH /api/orders - Cập nhật trạng thái hoặc chỉnh sửa thông tin đơn hàng
export async function PATCH(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const { orderId, status } = body;
    if (typeof orderId !== 'string') {
      return NextResponse.json({ success: false, message: 'Thiếu mã orderId' }, { status: 400 });
    }
    if (status && !['pending', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    const existing = await OrderModel.findOne({ orderId });
    if (!existing) return NextResponse.json({ success: false, message: 'Không tìm thấy đơn' }, { status: 404 });
    if (existing.status === 'completed' && status && status !== 'completed') {
      return NextResponse.json({ success: false, message: 'Đơn đã hoàn tất, không thể đổi ngược trạng thái' }, { status: 409 });
    }

    const updateFields: Record<string, any> = {};
    if (status) updateFields.status = status;
    if (typeof body.customerName === 'string') updateFields.customerName = body.customerName.trim();
    if (typeof body.customerPhone === 'string') updateFields.customerPhone = body.customerPhone.trim();
    if (typeof body.amount === 'number' && body.amount >= 0) updateFields.amount = body.amount;
    if (typeof body.note === 'string') updateFields.note = body.note.trim();
    if (typeof body.templateName === 'string') updateFields.templateName = body.templateName.trim();

    let updated;
    if (status === 'completed' && existing.orderType === 'vip_link' && existing.giftId) {
      await db.connection.transaction(async (session) => {
        const giftResult = await GiftModel.updateOne({ giftId: existing.giftId }, { $set: { isVip: true } }, { session });
        if (giftResult.matchedCount !== 1) throw new Error('Không tìm thấy quà liên kết đơn VIP');
        updated = await OrderModel.findOneAndUpdate({ orderId }, { $set: updateFields }, { new: true, session });
      });
    } else {
      updated = await OrderModel.findOneAndUpdate({ orderId }, { $set: updateFields }, { new: true });
    }
    return NextResponse.json({ success: true, data: updated, message: 'Đã cập nhật đơn hàng thành công' });
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
