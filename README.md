# 🚀 Flowork — AI Workspace Bot `v1.0.0`

**Flowork** là giải pháp "Biến Telegram thành remote điều khiển agent". Đây là tool cực kỳ ok giúp bạn duy trì tiến độ công việc ngay cả khi đã rời bàn máy tính: dù bạn đang bận **ăn cơm, đang ẻ, hay đang ở bất cứ đâu** mà không thể ngồi trước màn hình.

**Điểm ok:** Flowork tích hợp các Model AI ngon và miễn phí thông qua sức mạnh của **Codex CLI**. Bạn không cần tốn tiền mua API Key hay cấu hình lè nhè; AI sẽ thực thi yêu cầu của bạn nhanh chóng, an toàn và ok ngay trên telegram.

---

## ⚡ Cài đặt nhanh

1. **Cài đặt Codex CLI:** Project này yêu cầu Codex để thực hiện lệnh AI.
   ```bash
   npm i -g @google/codex
   ```
2. **Lấy Token:** Chat với [@BotFather](https://t.me/botfather) trong Telegram để tạo Bot và lấy **API Token**.
3. **Cấu hình:** Tạo file `.env` và điền Token của bạn:
   ```bash
   TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
   ```
4. **Chạy Bot:**
   ```bash
   npm install && npm run build && npm start
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

_Chúc bạn làm việc hiệu quả!_
