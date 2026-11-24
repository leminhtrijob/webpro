import mongoose from 'mongoose';

/**
 * Bộ kết nối MongoDB Atlas tối ưu hóa cho Serverless & Next.js 15+
 * Tự động cache connection để không tạo nhiều kết nối gây quá tải pool.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;

  // Nếu chưa điền MONGODB_URI thì trả về null (hệ thống tự chạy Fallback bộ nhớ an toàn)
  if (!uri) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('Lỗi kết nối MongoDB Atlas:', error);
    return null;
  }
}
