// Đọc/ghi database trực tiếp trong bài kiểm tra (xem lượt xem/bấm đã được lưu đúng chưa).
// Dùng thư viện pg (Prisma cũng dùng nó bên dưới) vì Playwright không nạp được Prisma Client.
import "dotenv/config";
import pg from "pg";

// allowExitOnIdle: kết nối tự đóng khi không dùng (các file kiểm tra dùng chung, không file nào tự đóng).
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, allowExitOnIdle: true });

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query(sql, params)).rows as T[];
}
