# Skipli Food Menu: bối cảnh dự án

Tài liệu này dành cho AI (và người) mới bắt đầu làm repo `skipli-food-menu`.
Đọc hết trước khi viết code. Nếu có chỗ mâu thuẫn hoặc thiếu thông tin, hãy hỏi lại trước khi làm.

---

## 1. Sản phẩm là gì

Một dịch vụ làm **menu online cho nhà hàng**, chạy trên điện thoại của khách.

- Chủ quán nhập menu (danh mục, món, giá, mô tả, extra, dị ứng).
- Hệ thống tạo một trang menu công khai, ví dụ `domain.com/@ten-quan`.
- Quán in mã QR đặt trên bàn, dán ở bio Instagram, hồ sơ Google, hoặc gửi qua WhatsApp.
- Hệ thống đếm lượt xem và cho chủ quán biết khách đang xem gì.

Khách hàng mục tiêu: nhà hàng nhỏ và vừa ở Mỹ (chủ quán không có người làm kỹ thuật).
Thị trường đã có sản phẩm tương tự, nên điểm khác biệt cần rõ ràng ngay từ bản đầu.

---

## 2. Yêu cầu từ leader

Leader đã nêu các ý sau. Đây là định hướng, chưa phải đặc tả cuối cùng.

1. **Menu đơn giản vẫn bán được.** Leader đưa ví dụ menu chữ đen trắng, dễ đọc, kiểu cũ nhưng vẫn có nhiều người dùng. Đây là bằng chứng nhu cầu, **không phải yêu cầu thiết kế**. Không bắt buộc làm menu chữ, nhưng phải có chế độ đơn giản nếu làm được.
2. **Theo dõi người vào xem menu.** Leader muốn biết có ai xem, xem lúc nào, xem món nào.
3. **Biết vị trí người xem.** Leader muốn biết khách ở đâu. Mức độ chi tiết chưa chốt, nhưng mặc định là **cấp thành phố**, không định vị từng người.
4. **Theo dõi lượt bấm vào món** (giống click tracking của SingleMenu mà leader đã nhắc).

---

## 3. Đối thủ tham khảo

### SinglePlatform
- Giá khoảng $199/tháng.
- Menu dạng chữ, đen trắng.
- Được nhiều quán cũ dùng vì quen và rẻ hơn in menu liên tục.

### 1FoodMenu
Đã nghiên cứu qua ảnh chụp màn hình (thư mục `~/Downloads/FoodMenu`). Các tính năng quan sát được:

**Dashboard**
- Biểu đồ lượt xem trang 7 ngày.
- Đếm số món, danh mục, extra, đánh giá.
- Bật/tắt trang (trang tắt thì link và QR không dẫn đi đâu).
- Nút copy link.

**QR code**
- Tải PNG hoặc SVG.
- Gợi ý vị trí đặt: trên bàn, bio Instagram, Google, tin nhắn WhatsApp.

**Menu**
- Món nằm trong danh mục (Pizza, Đồ uống, Tráng miệng...).
- Danh mục có thể đặt giờ phục vụ theo từng ngày trong tuần (ví dụ bữa sáng 7:00–11:00). Ngoài giờ thì ẩn.
- **Extra**: món thêm có giá (thêm phô mai, thêm sốt, thêm một phần phụ).
- **Allergen**: gắn mã A, B, C… cho món, hiện cạnh tên món, kéo để sắp xếp.

**Cài đặt trang**
- Tên quán, slogan, mô tả (có định dạng đậm, nghiêng, danh sách).
- Quốc gia và tiền tệ (mặc định USD).
- Link Google Maps.
- Logo (tối đa 500 KB), ảnh bìa, tối đa 6 ảnh giới thiệu.
- Màu nhấn: chọn sẵn hoặc tự chọn.
- Địa chỉ quán, hiện bản đồ và nút chỉ đường.
- Nút liên hệ: link tùy chỉnh (đặt bàn, đặt món), gọi điện, WhatsApp, email, chỉ đường. Chọn 2 nút hiện ở đầu trang.
- SEO: tiêu đề và mô tả hiện trên Google, bật/tắt đưa vào sitemap.

**Tính năng trả phí (Pro)**
- **Updates**: thông báo ngắn dưới tên quán (nghỉ lễ, ưu đãi tuần này, món mới). Tối đa 3 thông báo cùng lúc.
- **TV**: hiện menu lên màn hình TV trong quán bằng trình duyệt, đổi giá hoặc hết món thì TV cập nhật trong 2 phút. Có ba kiểu: bảng menu, lưới ảnh món, slideshow.
- Gỡ quảng cáo trên trang.
- Giá Pro: $129/năm.

**Hỗ trợ**: góp ý tính năng, chat trực tiếp, email.

---

## 4. Phạm vi bản đầu (MVP)

Làm được các việc này trước:

1. **Đăng nhập** chủ quán bằng email (chưa cần thanh toán).
2. **Nhập menu**: danh mục, món (tên, mô tả, giá, ảnh), sắp xếp, bật/tắt món. Có thể sửa nhanh giá trên điện thoại.
3. **Trang menu công khai** `/@slug`: đẹp và nhanh trên điện thoại, không cần khách đăng nhập. Có chế độ chữ đơn giản.
4. **Mã QR** tải PNG/SVG, chạy đúng khi quét bằng camera iPhone và Android.
5. **Thống kê**:
   - Lượt xem theo ngày (30 ngày).
   - Lượt bấm vào món, xếp hạng món được xem nhiều.
   - Nguồn truy cập (QR, link trực tiếp, trang khác) nếu có thể phân biệt.
   - Thành phố người xem (cấp thành phố, không lưu IP thô).
6. **Bật/tắt trang** (trang tắt thì trả về trang "chưa mở").

Để sau (chưa làm ở bản đầu):
- Thanh toán và gói Pro.
- Tích hợp TV.
- Updates (thông báo).
- Đăng nhiều quán dưới một tài khoản (chỉ làm khi có nhu cầu thật).
- Ứng dụng điện thoại riêng.
- Đồng bộ với Google Business Profile.

---

## 5. Yêu cầu kỹ thuật và quyền riêng tư

- **Không lưu IP thô.** Nếu cần đếm khách duy nhất, dùng mã băm có muối theo ngày, không dùng được để theo dõi một người qua nhiều ngày.
- **Bỏ qua bot** (Googlebot, công cụ xem trước link, crawler).
- **Chống spam lượt xem:** mỗi khách chỉ tính một lượt xem trong 30 phút; mỗi món chỉ tính một lượt bấm trong 5 phút; giới hạn 200 sự kiện mỗi khách mỗi ngày.
- **Trang công khai phải nhanh:** có cache, không bắt khách chờ.
- **Đa ngôn ngữ:** bản đầu chỉ tiếng Anh cho khách (thị trường Mỹ). Giao diện chủ quán có thể tiếng Việt nếu leader muốn.
- **Ảnh món và logo:** lưu trên object storage. Chưa có kho ảnh thì tạm để trống, không chặn luồng chính.
- **Dữ liệu demo:** dùng một quán giả (không dùng tên quán thật, không dùng số điện thoại thật).
- **Chưa chốt:** nền tảng, hosting, database. Nếu chưa có ý kiến khác thì đề xuất Next.js + Postgres, vì đây là bộ công cụ quen thuộc của chủ dự án, rồi hỏi lại trước khi cài.

---

## 6. Câu hỏi cần leader chốt

Claude không tự quyết các điểm sau, phải hỏi chủ dự án:

1. Giá gói và có miễn phí không (1FoodMenu có gói Free với quảng cáo).
2. Tên thương hiệu và tên miền chính thức.
3. Tracking vị trí: chỉ cấp thành phố, hay cần thêm gì khác.
4. Có làm trang menu chữ đen trắng riêng không, hay chỉ một giao diện.
5. Bản đầu có cần thanh toán không.
6. Ai là khách đầu tiên để thử.

---

## 7. Quy tắc làm việc

- **Ngôn ngữ:** trả lời và viết tài liệu bằng tiếng Việt, giải thích đơn giản, không dùng thuật ngữ nếu không cần. Leader không rành kỹ thuật.
- **Từ ngữ:** không gọi chủ quán là "mù" hoặc bất cứ từ nào mang nghĩa xúc phạm. Không ghi "đã làm" hay nhãn trạng thái vào tài liệu trình bày ý tưởng.
- **Bí mật:** không bao giờ yêu cầu người dùng dán API key, mật khẩu, token vào chat. Secret chỉ để trong file `.env` (không commit). Người dùng tự điền.
- **Git:** không chạy `git commit` hay `git push` khi chưa được yêu cầu rõ. Chỉ in lệnh ra để người dùng tự chạy.
- **Cổng chạy:** cổng 3000 có thể đang bị dự án khác của chủ dự án dùng. Khi chạy dev, dùng cổng khác (ví dụ 3300), và không tắt tiến trình không phải của mình.
- **Phạm vi:** chỉ làm việc trong repo `skipli-food-menu`. Không sửa thư mục khác.
- **Thay đổi lớn:** trước khi sửa nhiều file hoặc thêm thư viện, liệt kê kế hoạch và chờ xác nhận.
- **Kiểm tra:** sau mỗi tính năng, chạy test (nếu có) và kiểm tra trên trình duyệt. Báo đúng kết quả, không nói "xong" khi chưa chạy.
- **Báo cáo tiến độ:** mỗi lần làm xong một mục, ghi ngắn gọn 2–3 gạch đầu dòng vào `docs/tien-do.md` để leader theo dõi.

---

## 8. Thứ tự làm đề xuất

1. Tạo khung dự án, cài đặt, file `README.md`, file `.env.example` (không có giá trị thật).
2. Mô hình dữ liệu: quán, danh mục, món, extra, allergen, lượt xem, lượt bấm.
3. Nhập menu (có dữ liệu demo cho một quán giả).
4. Trang menu công khai và chế độ chữ đơn giản.
5. Mã QR.
6. Ghi nhận lượt xem và lượt bấm, có chống spam và loại bot.
7. Trang thống kê cho chủ quán.
8. Bật/tắt trang và kiểm tra trên điện thoại.

Mỗi bước: làm, chạy thử, rồi mới sang bước sau.

---

## AI dùng chung với Skipli Content

Repo này dùng chung AI với dự án `skipli-content-skills` (Gemini, Groq, GoClaw gateway).
Trước khi viết code gọi AI hoặc đọc ảnh menu, đọc skill `.claude/skills/skipli-ai/SKILL.md`.
Code có sẵn: `src/lib/ai/menu-vision.ts` (đọc ảnh menu ra danh mục, món, giá) và `src/lib/ai/goclaw.ts`.
Không thêm nhà cung cấp AI mới khi chưa hỏi. Key chỉ nằm trong `.env` và Vercel, không ghi vào code.
