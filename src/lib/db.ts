import mysql from 'mysql2/promise';

/**
 * Pool kết nối MySQL tối ưu hóa cho Next.js 15+ (App Router)
 * Hỗ trợ tự động kết nối lại (Auto-reconnect) và connection pooling hiệu năng cao.
 */
let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool | null {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);

  // Nếu chưa cấu hình biến môi trường MySQL thì trả về null (hệ thống tự chạy chế độ Static/Local an toàn)
  if (!host || !user || !database) {
    return null;
  }

  try {
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    return pool;
  } catch (error) {
    console.error('Lỗi khởi tạo kết nối MySQL:', error);
    return null;
  }
}

/**
 * Thực thi câu truy vấn SQL an toàn với tham số (Prepared Statement)
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDbPool();
  if (!db) {
    return [];
  }
  try {
    const [rows] = await db.execute(sql, params);
    return rows as T[];
  } catch (err) {
    console.error(`Lỗi thực thi truy vấn [${sql}]:`, err);
    throw err;
  }
}
