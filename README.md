# 🚀 Flowork — AI Workspace Bot `v1.0.0`

**Flowork** là giải pháp "Biến Telegram thành trung tâm điều khiển dự án". Đây là công cụ lý tưởng giúp bạn duy trì tiến độ công việc ngay cả khi đã rời bàn máy tính: dù bạn đang bận **nấu cơm, hay đang ẻ trong WC 🚽, hoặc đang bận bịu ở bất cứ đâu** mà không tiện ngồi trước màn hình.

Thông qua tin nhắn Telegram trên điện thoại, bạn có thể quản lý file, tạo thư mục và ra lệnh cho AI thực thi ngay tại các Workspace trên ổ đĩa của mình một cách an toàn và bảo mật. 🚀

---

## ⚡ Cài đặt nhanh (3 Bước)

1. **Lấy Token:** Chat với [@BotFather](https://t.me/botfather) trong Telegram để tạo Bot và lấy **API Token**.
2. **Cấu hình:** Tạo file `.env` và điền Token của bạn:
   ```bash
   TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
   ```
3. **Chạy Bot:**
   ```bash
   npm install
   ```
   Sau đó:
   ```bash
   npm run build && npm start
   ```

---

## 📂 Cách sử dụng

1. **Chọn dự án:** Dùng lệnh `/workspaces` để duyệt và chọn thư mục bạn muốn làm việc.
2. **Ra lệnh cho AI:** Sau khi chọn, bạn chỉ cần chat yêu cầu. AI sẽ thực thi ngay tại thư mục đó.
3. **Tạo mới:** Dùng nút `🆕 TẠO MỚI` trong Explorer để tạo thư mục dự án mới.

---

## 📋 Lệnh cơ bản

- `/workspaces` : Mở trình duyệt thư mục dự án.
- `/list` : Xem các file trong dự án hiện tại.
- `/status` : Kiểm tra xem bạn đang đứng ở đâu.
- `/stop` : Kết thúc phiên làm việc.
- `/help` : Hiện danh sách lệnh này.

---

## ⚖️ Giấy phép (License)

Dự án này được cấp phép theo tiêu chuẩn **MIT License**. Bạn có quyền tự do sử dụng, chỉnh sửa và chia sẻ.

_Chúc bạn làm việc hiệu quả cùng Flowork!_
