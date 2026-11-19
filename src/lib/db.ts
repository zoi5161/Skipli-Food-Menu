import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Giữ một kết nối duy nhất khi chạy dev (tránh mở thêm kết nối mỗi lần lưu file).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Thiếu DATABASE_URL trong file .env (xem .env.example).");
  }
  // Khi chạy trên Vercel, mỗi máy chạy giữ ít kết nối; dùng link "pooled" của Neon cho DATABASE_URL.
  const max = Number(process.env.DB_POOL_MAX ?? (process.env.VERCEL ? 5 : 10));
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max }) });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
