# Đưa Skipli Menu lên mạng

Tài liệu này hướng dẫn từng bước đưa app lên mạng bằng 4 dịch vụ, đều có gói miễn phí để bắt đầu:

| Dịch vụ | Dùng để | Biến cần điền |
|---|---|---|
| **Neon** | Database Postgres (chữ, số: menu, giá, thống kê) | `DATABASE_URL`, `DIRECT_URL` |
| **Cloudflare R2** | Kho ảnh chuẩn S3 (logo, ảnh món) | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` |
| **Resend** | Gửi email đăng nhập | `RESEND_API_KEY`, `EMAIL_FROM` |
| **Vercel** | Chạy trang web, dọn dữ liệu hằng ngày | `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` |

> **Bí mật:** các khóa (API key, link database) chỉ điền vào trang cài đặt của Vercel hoặc file `.env` trên máy. Không dán vào chat, không commit lên GitHub.

---

## 1. Chuẩn bị

- Code đã được push lên GitHub (repo `Skipli-Food-Menu`).
- Trên máy có Terminal để chạy vài lệnh.

## 2. Neon (database)

1. Vào https://neon.tech, đăng ký bằng tài khoản GitHub.
2. Bấm **Create project**:
   - Tên: `skipli-menu`
   - Postgres version: **17**
   - Region: **AWS US East (N. Virginia)**. Chọn vùng này cho gần máy chủ Vercel, trang sẽ nhanh hơn.
3. Mở **Connection Details** (hoặc nút **Connect**):
   - Bật **Connection pooling**, chép link (có chữ `-pooler`). Đây là `DATABASE_URL`.
   - Tắt **Connection pooling**, chép link. Đây là `DIRECT_URL`, dùng khi cập nhật cấu trúc database.
4. Giữ 2 link này để điền ở bước 5 (Vercel). Không gửi cho ai.

## 3. Cloudflare R2 (kho ảnh)

Database chỉ lưu đường dẫn tới ảnh; file ảnh nằm ở kho R2. R2 **không tính tiền gửi ảnh cho khách**, nên rẻ khi có nhiều khách xem menu.

1. Vào https://dash.cloudflare.com, đăng ký. Mở **R2 Object Storage**. Cloudflare có thể yêu cầu thêm thẻ thanh toán dù chỉ dùng trong mức miễn phí.
2. **Create bucket**: tên `skipli-menu-images`, Location **Automatic**.
3. Cho phép khách xem ảnh: vào bucket → **Settings → Public access**:
   - Có tên miền trên Cloudflare: **Connect Domain**, ví dụ `images.skiplimenu.com`. Đây là cách nên dùng khi chạy thật.
   - Chưa có tên miền: bật **R2.dev subdomain** để thử. Cloudflare giới hạn tốc độ địa chỉ này, không dùng cho quán thật.
   - Địa chỉ này (ví dụ `https://images.skiplimenu.com` hoặc `https://pub-xxxx.r2.dev`) là `S3_PUBLIC_URL`.
4. Quay lại trang R2 → **Manage R2 API Tokens → Create API token**:
   - Permissions: **Object Read & Write**, chỉ cho bucket `skipli-menu-images`.
   - Tạo xong, chép **Access Key ID** (`S3_ACCESS_KEY_ID`) và **Secret Access Key** (`S3_SECRET_ACCESS_KEY`). Khóa bí mật chỉ hiện một lần.
   - Chép địa chỉ **S3 API** dạng `https://<account-id>.r2.cloudflarestorage.com`. Đây là `S3_ENDPOINT` (bỏ tên bucket ở cuối nếu có).
5. `S3_BUCKET` = `skipli-menu-images`, `S3_REGION` = `auto`.

> Muốn đổi sang **Backblaze B2** hoặc **Amazon S3** sau này: chỉ cần đổi 6 biến `S3_*`, không sửa code. Ảnh cũ thì chép từ kho cũ sang kho mới.

## 4. Resend (email đăng nhập)

1. Vào https://resend.com, đăng ký.
2. **Domains → Add domain**: thêm tên miền của bạn (ví dụ `skiplimenu.com`) rồi làm theo hướng dẫn thêm bản ghi DNS. Khi trạng thái là **Verified** thì gửi được email cho mọi người.
   - Chưa có tên miền: tạm dùng người gửi `onboarding@resend.dev`. Cách này **chỉ gửi được tới email bạn dùng để đăng ký Resend**, đủ để tự thử, chưa dùng được với chủ quán thật.
3. **API Keys → Create API key**, quyền **Sending access**. Chép khóa (bắt đầu bằng `re_`). Đây là `RESEND_API_KEY`.
4. `EMAIL_FROM`: ví dụ `Skipli Menu <login@skiplimenu.com>`, hoặc `Skipli Menu <onboarding@resend.dev>` khi đang thử.

## 5. Vercel (trang web)

1. Vào https://vercel.com, đăng ký bằng GitHub.
2. **Add New → Project**, chọn repo `Skipli-Food-Menu`, bấm **Import**. Vercel tự nhận ra Next.js.
3. Mở **Environment Variables** và thêm:

   | Tên | Giá trị |
   |---|---|
   | `DATABASE_URL` | link pooled của Neon |
   | `DIRECT_URL` | link direct của Neon |
   | `NEXT_PUBLIC_APP_URL` | tạm để `https://skipli-food-menu.vercel.app` (sửa lại ở bước 7) |
   | `RESEND_API_KEY` | khóa Resend |
   | `EMAIL_FROM` | người gửi ở bước 3 |
   | `CRON_SECRET` | chuỗi ngẫu nhiên, tạo bằng lệnh `openssl rand -hex 32` trong Terminal |
   | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | từ bước 3 (R2) |
   | `REVALIDATE_SECRET` | chuỗi ngẫu nhiên, **giống** giá trị trong `.env.deploy` trên máy (xem mục 9). Không dùng chung database thì có thể bỏ qua |
   | `GEMINI_API_KEY`, `GROQ_API_KEY` | key AI dùng chung với Skipli Content (cho nút "Scan paper menu"). Tự chép từ `skipli-content-skills/deploy/.env`. Thiếu thì nút vẫn hiện nhưng báo "chưa cài đặt" |

4. Bấm **Deploy**. Khi build, Vercel tự tạo bảng trong database Neon (lệnh `prisma migrate deploy` trong script `vercel-build`).
5. **Settings → Functions → Function Region**: chọn **Washington, D.C. (iad1)**, cùng vùng với Neon.

## 6. Kiểm tra sau khi lên mạng

1. Mở địa chỉ Vercel đưa cho bạn (ví dụ `https://skipli-food-menu-xxxx.vercel.app`).
2. Vào `/login`, nhập email của bạn. Kiểm tra hộp thư (cả mục Spam) và bấm link.
3. Tạo quán, **tải logo và ảnh món**, bật trang ở **Settings → Page**. Bấm chuột phải vào ảnh trên trang khách: địa chỉ ảnh phải là địa chỉ R2 (`S3_PUBLIC_URL`).
4. **Quét mã QR bằng camera iPhone và Android** (lần đầu thử được thật). Menu phải mở ngay.
5. Mở menu vài lần trên điện thoại (dùng 4G, không dùng Wi‑Fi nhà), rồi xem **Stats**: lượt xem, thành phố và bản đồ phải có số liệu.
6. Chạy thử tải với địa chỉ thật (chỉ mở trang, không tạo lượt xem giả):

   ```bash
   node scripts/load-test.mjs --url https://ten-app.vercel.app --slug ten-quan --mode page --seconds 20 --concurrency 30
   ```

## 7. Đặt địa chỉ chính thức

- Khi có tên miền: **Vercel → Settings → Domains → Add**, làm theo hướng dẫn DNS.
- Sửa `NEXT_PUBLIC_APP_URL` thành địa chỉ chính thức (ví dụ `https://skiplimenu.com`), rồi bấm **Redeploy**.
- **Mã QR chứa địa chỉ này.** Nên chốt tên miền trước khi quán in QR, vì đổi tên miền sau đó thì QR đã in sẽ dẫn sai chỗ.

## 8. Chi phí và lưu ý

- **Vercel Hobby (miễn phí)** chỉ dành cho dự án cá nhân, không thương mại. Khi bắt đầu thu tiền của quán, cần lên gói **Pro** (khoảng $20/tháng; kiểm tra giá mới nhất trên trang Vercel).
- **Neon**, **Cloudflare R2** và **Resend** có gói miễn phí đủ cho giai đoạn đầu. Ước lượng ảnh: mỗi quán khoảng 10–15 MB, 1.000 quán khoảng 10–15 GB.
- **Ảnh demo lên R2 (không bắt buộc):** chạy `npx prisma db seed` trên máy, với `.env` tạm trỏ tới database Neon và kho R2. Ảnh demo sẽ được đưa lên R2.
- **Dọn dữ liệu:** Vercel tự gọi `/api/cron/cleanup` mỗi ngày (cấu hình trong `vercel.json`) để xóa link đăng nhập và phiên hết hạn, muối băm cũ, dữ liệu thống kê chi tiết cũ hơn 400 ngày.
- **Vị trí khách:** thành phố, bang, quốc gia và tọa độ (đã làm tròn khoảng 10 km) chỉ có khi chạy trên Vercel.

## 9. Bản trên máy dùng chung database với bản trên mạng (tuỳ chọn)

Dùng khi muốn sửa menu ở app trên máy (ví dụ lúc demo qua chia sẻ màn hình) mà link trên mạng cũng đổi theo ngay.

**Cách hoạt động:** app trên máy đọc và ghi thẳng vào database Neon và kho ảnh trên mạng. Mỗi lần chủ quán bấm lưu, app trên máy gửi tín hiệu tới `/api/revalidate` của bản trên mạng (kèm khóa `REVALIDATE_SECRET`), để bản trên mạng xóa lưu đệm trang menu của quán đó. Khách tải lại là thấy bản mới.

**Chuẩn bị (một lần):**
1. Mở file `.env.deploy` ở thư mục dự án, điền các giá trị giống trên Vercel: `DATABASE_URL`, `DIRECT_URL` và 6 biến `S3_*`.
2. `REVALIDATE_SECRET` đã có sẵn trong `.env.deploy`. Chép đúng giá trị đó vào Vercel (cùng tên), rồi **Redeploy**.
3. `REMOTE_APP_URL` trong `.env.deploy` là link Vercel. Sửa nếu Vercel đặt tên khác. **Không** thêm biến này vào Vercel.

**Đưa 5 quán demo lên database trên mạng (một lần, sau khi Vercel deploy xong):**

```bash
ALLOW_REMOTE_SEED=1 npx tsx --env-file=.env.deploy prisma/seed.ts
```

Lệnh này xóa rồi tạo lại 5 quán demo trên database thật, và tải ảnh demo lên kho ảnh. Thiếu `ALLOW_REMOTE_SEED=1` thì lệnh tự dừng để không xóa nhầm dữ liệu thật.

**Chuyển chế độ:**

| Lệnh | App trên máy dùng |
|---|---|
| `npm run env:shared` | Database Neon và kho ảnh trên mạng, dùng chung với Vercel |
| `npm run env:local` | Database Docker và ảnh trên máy (như ban đầu) |

Sau khi chuyển, tắt rồi chạy lại `npm run dev`. Bản cài đặt trên máy được giữ ở `.env.docker`.

**Lưu ý:**
- Đang ở chế độ dùng chung thì **mọi thay đổi trên máy là thay đổi thật** trên link mạng.
- Bộ kiểm tra tự động (`npm run test:e2e`) và lệnh nạp lại quán demo **tự từ chối chạy** khi database không ở trên máy. Muốn chạy kiểm tra thì `npm run env:local` trước.
- Trang quản lý trên máy chậm hơn (khoảng 1–2 giây mỗi trang) vì database ở Mỹ. Trang menu trên mạng vẫn nhanh.
- Ở chế độ dùng chung, link menu và mã QR trong trang quản lý trên máy trỏ về link trên mạng, nên quét bằng điện thoại thật là mở được.

## 10. Studio cho nhân viên (biến STAFF_EMAILS)

- Thêm biến `STAFF_EMAILS` trên Vercel (Settings → Environment Variables), ví dụ `an@skipli.com,binh@gmail.com`, hoặc `@skipli.com` để cho cả tên miền. Ai có trong danh sách thì vào Studio, thấy mọi quán và nhập được CSV.
- Database trên mạng cần thêm cột mã menu trước khi dùng bản mới: chạy `npx prisma migrate deploy` khi `.env` đang ở chế độ dùng chung (`npm run env:shared`).

## 11. Bulk upload và PDF lớn

- Supabase → Storage → bucket `skipli-menu-images` → **Edit bucket**: ở **Allowed MIME types** thêm `application/pdf` (hoặc để trống để nhận mọi loại), và đặt **File size limit** từ 20 MB trở lên. Chưa làm bước này thì tải PDF lên sẽ báo lỗi.
- Chạy `npx prisma migrate deploy` (chế độ dùng chung) để database trên mạng có bảng lịch sử menu và hàng chờ đọc file.
- AI đọc file phía sau tới 5 phút mỗi lượt. Đọc nhiều file liên tục cần `REVALIDATE_SECRET` (đã có) hoặc `JOBS_SECRET` trên Vercel để app tự gọi lượt tiếp theo; trang Bulk upload đang mở cũng tự gọi tiếp.
