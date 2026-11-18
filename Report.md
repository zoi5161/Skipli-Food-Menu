# Cách làm khi người dùng nhắn "Báo cáo"

Tài liệu này dành cho AI làm việc trong repo `skipli-food-menu`.
Khi người dùng nhắn đúng chữ **"Báo cáo"** (hoặc "Báo cáo" kèm ngày, ví dụ "Báo cáo 19-11"), làm đúng các bước dưới đây.

---

## 1. Xác định ngày và phạm vi

- **Ngày báo cáo:**
  - Nếu người dùng ghi ngày (ví dụ "Báo cáo 19-11" hoặc "báo cáo ngày 19-11-2026"), dùng đúng ngày đó.
  - Nếu không ghi ngày, dùng ngày hôm nay theo đồng hồ của máy.
  - Định dạng thư mục: `DD-MM-YYYY` (ví dụ `19-11-2026`).
- **Phạm vi:** chỉ công việc **từ lần "Báo cáo" trước đến giờ**. Nếu chưa có lần nào trước đó, lấy phần việc người dùng vừa nói trong cuộc trò chuyện.
- **Không** kiểm tra `git log` hay `git status` để tìm việc. Dựa vào những gì đã làm trong cuộc trò chuyện và nội dung người dùng cung cấp.

---

## 2. Đưa lệnh commit và push (chỉ in ra, không chạy)

Luôn in ba lệnh này cho người dùng tự chạy:

```bash
git add -A
git commit -m "<một dòng mô tả ngắn, tiếng Anh, theo kiểu feat: / fix: / chore:>"
git push origin main
```

- **Không bao giờ** tự chạy `git commit` hoặc `git push`.
- Message commit viết tiếng Anh, một dòng, ngắn gọn.
- Nếu repo có quy định thêm dòng `Co-Authored-By` ở cuối message, thêm đúng dòng đó theo model đang dùng.

---

## 3. Viết tin nhắn báo cáo

Quy tắc bắt buộc:

- **Mở đầu đúng một câu:** `Hi anh @John Ton, hôm nay em:`
- Sau đó là **2 đến 3 gạch đầu dòng**. Mỗi dòng bắt đầu bằng động từ như "Xây dựng…", "Triển khai…", "Cấu hình…", "Thiết kế…".
- Mỗi dòng ngắn, dùng ngôn ngữ đơn giản, có thể kỹ thuật ở mức vừa phải. Người nhận không rành lập trình.
- **Không** có tiêu đề, **không** ghi ngày trong nội dung.
- **Không** nhắc đến test, kiểm tra token, kết quả chạy lệnh.
- **Không** nhắc đến tên dự án khác, repo khác, hay các dự án cũ.
- **Không** dùng các từ mang nghĩa xúc phạm.

Ví dụ đúng:

```
Hi anh @John Ton, hôm nay em:
- Xây dựng tab Menu cho từng quán: nhập món, giá, ảnh, nhãn, tự lưu kèm khung xem trước trên điện thoại.
- Triển khai trang menu công khai cho khách, có mã QR để đặt trên bàn.
- Cấu hình thống kê lượt xem theo ngày, món được bấm nhiều, và thành phố người xem (không lưu IP).
```

---

## 4. Chụp ảnh minh chứng

- **Thư mục lưu ảnh:** `~/Downloads/Báo cáo/Skipli Food Menu/<DD-MM-YYYY>/`
  - Nếu thư mục chưa có thì tạo mới. Không xóa ảnh cũ của ngày khác.
- **Số lượng:** từ 1 đến 3 ảnh. Mỗi ảnh chứng minh được ít nhất một gạch đầu dòng trong tin nhắn.
- **Nội dung ảnh:** giao diện app, trang công khai, kết quả chạy test (nếu liên quan).
- **Đặt tên ảnh** theo thứ tự và nội dung, ví dụ: `1-menu-editor.png`, `2-trang-menu-dien-thoai.png`, `3-thong-ke-luot-xem.png`.
- **Không chụp** đoạn chat, cửa sổ terminal có chứa key, hay thông tin cá nhân của người dùng.
- **Dữ liệu trong ảnh** dùng dữ liệu demo (quán giả).
- Chụp ở độ phân giải Retina (2x) để ảnh rõ khi đưa lên báo cáo.

---

## 5. Khi người dùng tự cung cấp nội dung báo cáo

Đôi khi người dùng đã có sẵn tin nhắn báo cáo và chỉ nhờ chụp ảnh. Trường hợp này:

- Dùng nguyên văn tin nhắn người dùng đưa, **không sửa**.
- Tạo đúng thư mục theo ngày người dùng ghi.
- Chụp ảnh minh chứng khớp với từng gạch đầu dòng của tin nhắn đó.
- Vẫn in lệnh commit (mục 2) nếu người dùng yêu cầu.

---

## 6. Đầu ra cuối cùng cần đưa cho người dùng

Trả lời theo đúng thứ tự:

1. **Lệnh commit và push** (chỉ in ra).
2. **Tin nhắn báo cáo** (đúng mẫu mục 3).
3. **Đường dẫn thư mục ảnh** và danh sách tên file ảnh đã lưu.

Không thêm lời giải thích dài dòng. Nếu có việc chưa làm được (ví dụ chưa chạy app được để chụp), nói rõ ngắn gọn và đề nghị cách làm tiếp.

---

## 7. Những điều không được làm

- Không tự commit, push, tạo nhánh, hay tạo tag.
- Không gộp nhiều ngày vào một thư mục.
- Không tự thêm mục "đã làm" hay nhãn trạng thái vào tin nhắn báo cáo.
- Không đưa API key, token hay mật khẩu vào tin nhắn hay ảnh.
- Không hỏi người dùng dán key vào chat.
