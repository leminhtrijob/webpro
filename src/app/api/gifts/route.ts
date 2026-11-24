import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { GiftModel } from '@/models/GiftModel';
import { compressGiftConfig } from '@/lib/compression';
import crypto from 'node:crypto';
import { requireAdmin } from '@/lib/adminAuth';
import { AVAILABLE_TEMPLATES } from '@/data/availableTemplates';
import { getSessionFromRequest } from '@/lib/userAuth';
import { UserModel } from '@/models/UserModel';
import { statSync } from 'node:fs';
import path from 'node:path';

function playableGiftAudio<T extends { musicUrl?: string; musicTitle?: string }>(gift: T) {
  const url = gift.musicUrl;
  if (!url?.startsWith('/audio/')) return gift;
  const fileName = path.basename(url);
  let playable = fileName === url.slice('/audio/'.length);
  if (playable) {
    try { playable = statSync(path.join(process.cwd(), 'public', 'audio', fileName)).size > 1024; }
    catch { playable = false; }
  }
  return playable ? gift : {
    ...gift,
    musicUrl: '/audio/trikun-theme.wav',
    musicTitle: 'Nhạc nền TriKun (thay thế tệp cũ bị thiếu)',
    audioFallbackUsed: true
  };
}

// POST: Tạo mới hoặc Lưu Quà Tặng vào MongoDB Atlas
export async function POST(req: Request) {
  try {
    if (Number(req.headers.get('content-length') || 0) > 5_000_000) {
      return NextResponse.json({ success: false, message: 'Ảnh hoặc nội dung quá lớn' }, { status: 413 });
    }
    const config = await req.json();
    if (!config || typeof config.templateSlug !== 'string' || !AVAILABLE_TEMPLATES.some((item) => item.slug === config.templateSlug) || typeof config.recipientName !== 'string' || !config.recipientName.trim() || config.recipientName.length > 100 || typeof config.senderName !== 'string' || config.senderName.length > 100 || typeof config.letterContent !== 'string' || config.letterContent.length > 10000 || !Array.isArray(config.images) || config.images.length > 12 || (config.passcodeEnabled && (typeof config.passcode !== 'string' || !/^\d{4,8}$/.test(config.passcode)))) {
      return NextResponse.json({ success: false, message: 'Dữ liệu quà tặng không hợp lệ' }, { status: 400 });
    }
    const giftId = `TK${crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
    config.isVip = false;

    // Nén chuỗi dự phòng
    const compressedData = compressGiftConfig(config);

    // Thử kết nối và lưu vào MongoDB Atlas
    const db = await connectToDatabase();
    let savedToMongo = false;

    if (db) {
      try {
        const session = getSessionFromRequest(req);
        const owner = session ? await UserModel.findOne({ userId: session.userId, sessionVersion: session.sv, status: 'active' }).select('userId').lean() : null;
        await GiftModel.create(
          {
            giftId,
            ...(owner ? { ownerUserId: owner.userId } : {}),
            templateSlug: config.templateSlug || 'myheart-7',
            templateName: config.templateName || 'Vũ Trụ Trái Tim 3D',
            recipientName: config.recipientName || 'Người Thương',
            senderName: config.senderName || 'Trí Kun',
            particlesEnabled: config.particlesEnabled !== false,
            particleColor: config.particleColor || '#FF4F86',
            particleCount: config.particleCount || 180,
            particleType: config.particleType || 'heart',
            images: config.images || [],
            showSphere3D: config.showSphere3D !== false,
            letterEnabled: config.letterEnabled !== false,
            letterTitle: config.letterTitle || 'Lá Thư Tình Yêu',
            letterContent: config.letterContent || '',
            showLetterPhoto: config.showLetterPhoto !== false,
            musicId: config.musicId || 'm1',
            musicTitle: config.musicTitle || 'Lễ Đường',
            musicUrl: config.musicUrl || '/audio/leduong.mp3',
            autoPlay: config.autoPlay !== false,
            passcodeEnabled: config.passcodeEnabled || false,
            passcode: config.passcode || '',
            passcodeHint: config.passcodeHint || '',
            themeColor: config.themeColor || '#FF4F86',
            tabTitle: config.tabTitle || 'Quà Tặng Tình Yêu',
            isVip: false
          }
        );
        savedToMongo = true;
      } catch (mongoErr) {
        console.error('Lỗi lưu MongoDB:', mongoErr);
        return NextResponse.json({ success: false, message: 'Không thể lưu quà lên database' }, { status: 503 });
      }
    }

    return NextResponse.json({
      success: true,
      giftId,
      savedToMongo,
      compressedData,
      giftUrl: savedToMongo
        ? `/v/${config.templateSlug}?id=${giftId}`
        : `/v/${config.templateSlug}?data=${compressedData}`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Lỗi lưu thông tin quà tặng' },
      { status: 500 }
    );
  }
}

// GET: Lấy quà tặng theo ID, đếm số lượng, hoặc lấy danh sách tất cả quà
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const giftId = searchParams.get('id');
    const countOnly = searchParams.get('count');
    const all = searchParams.get('all');
    const recordView = searchParams.get('view') === '1';

    if (countOnly || all === '1') {
      const denied = requireAdmin(req);
      if (denied) return denied;
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    if (countOnly) {
      const totalCount = await GiftModel.countDocuments();
      return NextResponse.json({ success: true, totalCount });
    }

    if (all === '1') {
      const gifts = await GiftModel.find({}).sort({ createdAt: -1 }).limit(100).lean();
      return NextResponse.json({ success: true, data: gifts, totalCount: await GiftModel.countDocuments() });
    }

    if (!giftId) {
      return NextResponse.json({ success: false, message: 'Thiếu mã giftId' }, { status: 400 });
    }

    const gift = await GiftModel.findOne({ giftId }).lean();
    if (gift) {
      if (recordView) await GiftModel.updateOne({ giftId }, { $inc: { viewsCount: 1 } });
      return NextResponse.json({ success: true, data: playableGiftAudio(gift) });
    }

    return NextResponse.json({ success: false, message: 'Không tìm thấy quà tặng' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi máy chủ' }, { status: 500 });
  }
}

// DELETE: Xóa quà tặng khỏi MongoDB Atlas
export async function DELETE(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const giftId = searchParams.get('id');

    if (!giftId) {
      return NextResponse.json({ success: false, message: 'Thiếu mã giftId' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Chưa kết nối database' }, { status: 500 });
    }

    await GiftModel.deleteOne({ giftId });
    return NextResponse.json({ success: true, message: 'Đã xóa quà thành công' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Lỗi xóa quà' }, { status: 500 });
  }
}
