// Cấu hình Prisma: vị trí schema, migration, lệnh seed và link database (đọc từ .env).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Lệnh migrate cần kết nối trực tiếp (Neon: link "direct", không qua pooler).
  // Không có DIRECT_URL thì dùng DATABASE_URL (chạy trên máy).
  datasource: {
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
