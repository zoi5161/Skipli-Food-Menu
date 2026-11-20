# Tiến độ

## Phase 0: Khung dự án (18-11-2026)

- Tạo dự án Next.js 16 chạy ở cổng 3300, kèm Tailwind cho giao diện.
- Cài database Postgres chạy bằng Docker (cổng 5433) và Prisma để làm việc với database; trang chủ tạm hiện trạng thái kết nối.
- Viết hướng dẫn chạy (`README.md`) và file cấu hình mẫu `.env.example` (không có giá trị thật).

## Phase 1: Đăng nhập và nhập menu (18-11-2026)

- Chủ quán đăng nhập bằng link gửi qua email (không mật khẩu, link dùng 1 lần, hết hạn 15 phút); lần đầu đặt tên quán là có link riêng.
- Trang Menu: danh mục (có giờ phục vụ, hiện kèm giờ), món (giá, mô tả, nhãn chay/không gluten…, dị ứng A/B/C, extra), kéo thả để sắp xếp, sửa giá và bấm "Hết món" ngay trong danh sách, dùng tốt trên điện thoại.
- Có quán demo "Lantern & Ladle" (quán giả) và bộ kiểm tra tự động chạy trên khung máy tính lẫn điện thoại.

## Phase 2: Trang menu cho khách và cài đặt trang (18-11-2026)

- Trang menu công khai `/@ten-quan` cho điện thoại: logo, nút Gọi/Chỉ đường, danh mục kèm giờ phục vụ, lọc món theo chế độ ăn, bấm món để xem chi tiết (extra, dị ứng), bản đồ và bảng mã dị ứng. Trang tắt hoặc link sai thì báo "chưa mở".
- Trang Cài đặt: thông tin quán, địa chỉ, bật/tắt trang, đổi link, màu nhấn, SEO và sitemap, các nút liên hệ (gọi, WhatsApp, email, link riêng, chỉ đường) và chọn 2 nút ở đầu trang.
- Trang khách có lưu đệm để mở nhanh; chủ quán sửa gì (giá, hết món, bật/tắt) thì khách thấy ngay ở lần tải tiếp theo.

## Phase 3: Mã QR (19-11-2026)

- Mã QR của quán hiện ở Dashboard và Settings → Page, tải được PNG (1200×1200, để in) và SVG (nét ở mọi cỡ, gửi tiệm in).
- Link trong mã có dấu `?src=qr` để sau này đếm được bao nhiêu khách vào bằng cách quét mã.
- Kiểm tra tự động: Chrome quét được mã (cả ảnh trên màn hình lẫn file PNG tải về) và mở ra đúng trang menu.

## Chọn kiểu menu (19-11-2026)

- Chủ quán chọn kiểu trang menu ở Settings → Design: **Modern** (thẻ món, dải màu, hợp quán có ảnh) hoặc **Classic** (giống menu in giấy: chữ có chân, tên món ….. giá). Đổi kiểu không mất dữ liệu, khách thấy ngay.
- Mỗi kiểu là một bộ giao diện riêng, phần dữ liệu và tính năng (lọc món, chi tiết món, bản đồ, nút liên hệ) dùng chung, nên sau này thêm template mới chỉ cần thêm một file giao diện.
- Màu chủ đạo chuyển sang cùng tab Design.

## Nâng cấp giao diện trang menu (19-11-2026)

- Trang khách kiểu Modern làm lại theo hướng 1FoodMenu: ảnh bìa lớn, logo, nút chia sẻ, thanh danh mục dính trên đầu có ô tìm món và bộ lọc, mục "Chef's picks" có ảnh, món 2 cột kèm ảnh, cột bên phải hiện "Open now / Closed", giờ hôm nay, địa chỉ. Bên dưới có ẩn món theo dị ứng, bản đồ + giờ mở cửa 7 ngày, giới thiệu quán kèm ảnh, danh sách liên hệ. Kiểu Classic làm lại giống menu giấy cao cấp (tên quán chữ lớn, bảng giờ bên phải, món 2 cột).
- Chủ quán tải được logo, ảnh bìa, tối đa 6 ảnh giới thiệu và ảnh từng món (ảnh tự thu nhỏ trước khi gửi); nhập giờ mở cửa từng ngày (kể cả mở qua nửa đêm), ghi chú đường đi; đánh dấu món "Chef's pick".
- Quán demo có ảnh thật (Unsplash, miễn phí bản quyền), logo, giờ mở cửa. Ảnh hiện lưu trên máy; khi đưa lên mạng (Phase 6) sẽ chuyển sang kho ảnh online.

## Phase 4: Ghi nhận lượt xem và lượt bấm món (19-11-2026)

- Mỗi lần khách mở menu được ghi lại: giờ xem, nguồn vào (quét QR, Instagram, Facebook, Google, link trực tiếp, trang khác), loại máy (điện thoại, máy tính bảng, máy tính) và thành phố / bang / quốc gia (lấy từ máy chủ khi chạy thật). Mỗi lần khách bấm xem chi tiết món cũng được ghi lại.
- Không lưu địa chỉ IP: chỉ lưu một mã băm đổi mỗi ngày, đủ để đếm "bao nhiêu khách khác nhau trong ngày" nhưng không theo dõi được một người qua nhiều ngày.
- Chống đếm sai: bỏ qua bot Google, công cụ xem trước link (WhatsApp, Facebook, Slack…) và lượt xem của chính chủ quán; mỗi khách chỉ tính 1 lượt xem trong 30 phút, 1 lượt bấm mỗi món trong 5 phút, tối đa 200 sự kiện mỗi ngày.

## Phase 5: Trang thống kê cho chủ quán (19-11-2026)

- Trang Stats mới: tổng lượt xem, số khách, lượt bấm món, lượt quét QR (so với kỳ trước), biểu đồ lượt xem theo ngày (7 / 30 / 90 ngày) và theo giờ trong ngày (giờ đông khách, ngày đông nhất), món được xem nhiều nhất kèm ảnh, khách đến từ đâu (QR, Google, Instagram…), dùng điện thoại hay máy tính, ở thành phố nào. Trang Dashboard có ô tóm tắt 7 ngày.
- Ngày và giờ tính theo múi giờ của quán (chọn ở Settings → Location & hours). Biểu đồ rê chuột / chạm để xem số, có nút xem dạng bảng, dùng tốt trên điện thoại.
- Quán demo có số liệu giả 90 ngày để xem thử. Trang Stats mở trong khoảng 0,1 giây với vài nghìn lượt xem.

## Phase 5 mở rộng: Bản đồ vị trí khách (19-11-2026)

- Trang Stats có bản đồ "Where guests are": mỗi thành phố có khách là một chấm tròn (càng nhiều lượt xem càng to), chạm/rê chuột để xem số. Ba chế độ: Nearby (tự phóng to vùng nhiều khách, ghi tên thành phố), United States (các bang) và World (tô màu nước theo số lượt xem).
- Vị trí lấy theo nhà mạng của khách (không phải GPS, không hỏi quyền), chỉ ở cấp thành phố: tọa độ làm tròn ~10 km, không lưu IP, chỉ hiện tổng theo thành phố.
- Dữ liệu bản đồ chỉ tải ở trang Stats của chủ quán, trang menu của khách không chậm đi. Quán demo có khách ở 17 thành phố (có khách du lịch nước ngoài) để xem thử.

## Phase 6: Chuẩn bị đưa lên mạng (20-11-2026)

- Gửi email đăng nhập thật qua Resend (email có nút đăng nhập, link dùng 1 lần, hết hạn 15 phút); cấu hình sẵn cho Vercel + Neon (tự cập nhật database khi đưa code mới lên), dọn dữ liệu cũ mỗi ngày, thêm các lớp bảo mật cho trang.
- Chạy thử tải bản chạy thật trên máy: 50 khách cùng lúc mở menu, 0 lỗi, khoảng 145 lượt mở trang mỗi giây trên một máy; ghi lượt xem khoảng 850 lần mỗi giây, trả lời trong khoảng 0,03 giây. Trang menu nặng khoảng 20 KB.
- Viết hướng dẫn từng bước tạo tài khoản và đưa app lên mạng (docs/trien-khai.md).
- Kho ảnh theo chuẩn S3 (đề xuất Cloudflare R2: không tính tiền gửi ảnh cho khách); đổi sang Backblaze B2 hay Amazon S3 chỉ cần đổi khóa. Đã chạy thử toàn bộ với một kho S3 giả lập trên máy: tải ảnh, xóa ảnh, trang khách hiện ảnh đúng.

## Giá theo cỡ (23-11-2026)

- Món có thể có nhiều cỡ với giá riêng (Small / Large, Glass / Bottle, 6 / 12 miếng…, tối đa 6 cỡ). Chủ quán bật "Sizes" trong form món; nhập thiếu tên, thiếu giá hay trùng tên thì báo ngay.
- Trang khách: 2 cỡ hiện từng giá ("Glass $4.50 · Pitcher $14.00", kiểu Classic dùng dấu "/"), nhiều cỡ hơn hiện "from $3.50"; bấm vào món thấy bảng giá từng cỡ. Danh sách món của chủ quán hiện "from $x".
- Quán demo có món theo cỡ: Pancakes, Lemonade, Cold Brew, Hibiscus Tea.

## Nhập menu từ ảnh và logo (23-11-2026)

- Nút "Scan paper menu" trong trang Menu: chủ quán chụp hoặc chọn ảnh menu giấy (tối đa 4 trang), AI đọc ra danh mục, món, giá và giá theo cỡ; chủ quán xem lại, sửa tên/giá, bỏ món sai rồi mới thêm vào menu. Món vào đúng danh mục cùng tên nếu đã có.
- Dùng AI chung với Skipli Content theo bộ kit (Gemini, quá tải thì chuyển Groq; không qua GoClaw). Giới hạn 30 lần đọc mỗi quán mỗi ngày để giữ hạn mức miễn phí.
- Gắn logo Skipli: icon tab trình duyệt, đầu trang quản lý, trang đăng nhập, trang chủ, email đăng nhập, dòng "Made with" cuối menu.
- Chạy thử AI thật với ảnh menu quán phở mẫu: đọc đúng 9/9 món, giá, giá theo cỡ (Regular / Large), mô tả và dấu tiếng Việt; từ lúc chọn ảnh đến lúc hiện màn hình xem lại khoảng 30 giây. Đã giới hạn thời gian chờ mỗi model AI để chủ quán không phải chờ lâu khi một model bị treo.

## Thêm 4 quán demo (23-11-2026)

- Thêm 4 quán giả theo loại quán phổ biến ở Mỹ, mỗi quán có ảnh món, logo, giờ mở cửa, giá theo cỡ và số liệu thống kê 90 ngày: **Casa Lupita Taqueria** (taco Mexico, San Antonio), **Pho Saigon Corner** (phở, Little Saigon California, kiểu menu Classic), **Brick Oven Pizza Co.** (pizza, Brooklyn), **Morning Grind Café** (cà phê, Denver).
- Mỗi quán có một tài khoản riêng để thử trang quản lý (danh sách trong README). Dữ liệu demo gom vào một file, thêm quán mới chỉ cần thêm một khối dữ liệu.
- Sửa kiểu menu Classic: món có nhiều cỡ (Regular / Large) hiện giá trên dòng riêng dưới tên món, không còn tràn khỏi màn hình điện thoại.

## 6 kiểu menu cho chủ quán chọn (23-11-2026)

- Thêm 4 kiểu menu mới, tổng cộng 6 kiểu: **Modern**, **Classic**, **Bold** (chữ to đậm, giá trong ô màu, hợp quán taco/food truck), **Grid** (lưới ảnh 2 cột kiểu Instagram, hợp cafe/tiệm bánh), **Dark** (nền tối sang trọng, hợp pizza/bar), **Simple** (chữ đen trắng cỡ lớn, không cần ảnh, giống menu chữ của SinglePlatform). Mỗi kiểu ghi rõ "hợp với loại quán nào".
- Settings → Design có khung điện thoại **xem thử ngay menu thật của quán** với kiểu và màu đang chọn; khách vẫn thấy kiểu cũ cho tới khi chủ quán bấm "Use this style". Trên điện thoại có nút xem toàn màn hình.
- Các quán demo dùng mỗi quán một kiểu để demo ngay: taco (Bold), phở (Classic), pizza (Dark), cafe (Grid). Đã kiểm tra cả 6 kiểu trên điện thoại và máy tính: đủ món, mở chi tiết món, không tràn màn hình.
