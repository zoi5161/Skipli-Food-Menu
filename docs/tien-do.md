# Tiến độ

## Phase 0: Khung dự án (18-11-2026)

- Tạo dự án Next.js 16 chạy ở cổng 3300, kèm Tailwind cho giao diện.
- Cài database Postgres chạy bằng Docker (cổng 5433) và Prisma để làm việc với database; trang chủ tạm hiện trạng thái kết nối.
- Viết hướng dẫn chạy (`README.md`) và file cấu hình mẫu `.env.example` (không có giá trị thật).

## Phase 1: Đăng nhập và nhập menu (18-11-2026)

- Chủ quán đăng nhập bằng link gửi qua email (không mật khẩu, link dùng 1 lần, hết hạn 15 phút); lần đầu đặt tên quán là có link riêng.
- Trang Menu: danh mục (có giờ phục vụ, hiện kèm giờ), món (giá, mô tả, nhãn chay/không gluten…, dị ứng A/B/C, extra), kéo thả để sắp xếp, sửa giá và bấm "Hết món" ngay trong danh sách, dùng tốt trên điện thoại.
- Có quán demo "Lantern & Ladle" (quán giả) và bộ kiểm tra tự động chạy trên khung máy tính lẫn điện thoại.
