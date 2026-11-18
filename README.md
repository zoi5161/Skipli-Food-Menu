# Skipli Food Menu

Dịch vụ làm menu online cho nhà hàng: chủ quán nhập menu, hệ thống tạo trang `/@ten-quan` kèm mã QR,
và cho chủ quán biết khách đang xem gì, lúc nào, ở thành phố nào.

Bối cảnh và phạm vi: xem [CLAUDE.md](CLAUDE.md). Tiến độ: xem [docs/tien-do.md](docs/tien-do.md).

## Công cụ

- Next.js 16 (giao diện và máy chủ), Tailwind CSS (giao diện)
- Postgres 17 (database), Prisma 7 (làm việc với database)
- Docker (chạy database trên máy)

## Chạy trên máy

Cần có: Node.js 20 trở lên, Docker Desktop đang bật.

```bash
# 1. Cài thư viện
npm install

# 2. Tạo file cấu hình, rồi điền APP_SECRET (tạo bằng: openssl rand -base64 32)
cp .env.example .env

# 3. Bật database (cổng 5433)
npm run db:up

# 4. Tạo bảng trong database và nạp quán demo
npx prisma migrate dev
npx prisma db seed

# 5. Chạy app ở http://localhost:3300
npm run dev
```

## Thử nhanh với quán demo

1. Mở http://localhost:3300/login, nhập `demo@example.com`.
2. Khi chạy trên máy, app chưa gửi email thật: link đăng nhập hiện ngay trên trang (và in ra terminal). Bấm link, rồi bấm "Continue".
3. Vào **Menu** để sửa danh mục, món, giá, extra, dị ứng.

Quán demo "Lantern & Ladle" là quán giả, số điện thoại dạng 555 (không có thật).
Chạy lại `npx prisma db seed` để đưa quán demo về trạng thái ban đầu.

## Kiểm tra tự động

```bash
npm test          # kiểm tra các hàm nhỏ (giá, link, giờ phục vụ…)
npm run test:e2e  # kiểm tra trên Chrome, cả khung máy tính và điện thoại (cần quán demo)
```

## Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy app ở cổng 3300 |
| `npm run build` | Build bản chạy thật |
| `npm run lint` | Kiểm tra lỗi code |
| `npm run db:up` / `npm run db:down` | Bật / tắt database |
| `npm run db:migrate` | Cập nhật cấu trúc database theo `prisma/schema.prisma` |
| `npm run db:studio` | Mở giao diện xem dữ liệu |

## Lưu ý

- App chạy cổng **3300** (cổng 3000 có thể đang dùng cho dự án khác).
- Không commit file `.env`. Chỉ commit `.env.example` (không có giá trị thật).
