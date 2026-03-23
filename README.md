# Flowork `v1.0.1`

Flowork là bot Telegram giúp bạn điều khiển AI agent từ xa ngay trên máy tính của mình thông qua `codex` CLI. Điểm thực dụng nhất của project là người dùng có thể tận dụng các model mạnh sẵn có trong hệ sinh thái CLI mà không cần tự dựng luồng API riêng, không phải cấu hình phức tạp, và cũng không phải tốn thêm chi phí kiểu gọi API theo request như các cách tích hợp truyền thống.

Mục tiêu của Flowork là biến Telegram thành một chiếc remote điều khiển workspace: bạn chọn đúng thư mục dự án, gửi yêu cầu ngay trong khung chat, và agent sẽ chạy trực tiếp trong workspace đó. Cách này đặc biệt hữu ích khi bạn không ngồi trước máy tính, ví dụ đang ra ngoài, đang ăn uống, đang di chuyển, hoặc chỉ đơn giản là muốn theo dõi và ra lệnh nhanh từ điện thoại mà vẫn giữ được luồng làm việc liên tục.

## Yêu cầu

- Node.js
- `codex` CLI đã được cài và có thể gọi bằng lệnh `codex`
- Telegram bot token từ [@BotFather](https://t.me/botfather)
- Telegram user id được phép sử dụng bot

## Cấu hình

Tạo file `.env` với nội dung tối thiểu:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
ALLOWED_USER_ID=123456789
PROJECTS_DIR=e:\
```

Ghi chú:

- `ALLOWED_USER_ID` là Telegram user id được phép dùng bot.
- Có thể khai báo nhiều user id bằng dấu phẩy, ví dụ `ALLOWED_USER_ID=123456789,987654321`.
- Nếu không cấu hình `PROJECTS_DIR`, bot sẽ mặc định dùng `e:\fullstack`.
- Bot sẽ dừng ngay khi khởi động nếu thiếu `TELEGRAM_BOT_TOKEN`, thiếu `ALLOWED_USER_ID`, hoặc không tìm thấy `codex`.

## Chạy bot

```bash
npm install
npm run build
npm start
```

## Cách hoạt động

1. Dùng `/workspaces` để duyệt và chọn thư mục làm việc.
2. Mỗi lần chọn workspace, bot sẽ mở một phiên mới trong workspace đó.
3. Các tin nhắn gửi tiếp theo sẽ được tiếp tục trong workspace hiện tại bằng `codex exec resume --last`.
4. Dùng `/stop` để xóa state hiện tại. Muốn làm tiếp thì chọn workspace lại.
5. User không nằm trong `ALLOWED_USER_ID` sẽ bị chặn toàn bộ command, callback và message.

## Lệnh hỗ trợ

- `/workspaces`: mở trình duyệt workspace
- `/list`: xem file trong workspace hiện tại
- `/status`: xem workspace đang active
- `/stop`: xóa state hiện tại
- `/help`: hiện hướng dẫn nhanh
- `/new`: hướng dẫn tạo dự án mới từ explorer

## Bảo mật và giới hạn

- Đây là bot điều khiển agent trên máy thật. Chỉ nên cấp quyền cho user bạn tin tưởng.
- Không nên chia sẻ token bot, file `.env`, hoặc Telegram user id được cấp quyền.
- Không nên gửi thông tin nhạy cảm qua bot, ví dụ mật khẩu, private key, API key, cookie, dữ liệu khách hàng, hoặc tài liệu nội bộ quan trọng.
- Không nên dùng bot để đọc, trích xuất, sao chép, hoặc gửi ra ngoài các dữ liệu mà bạn không muốn lộ.
- Nếu bot bị người khác tìm thấy trên Telegram, họ vẫn có thể nhìn thấy bot tồn tại. Cơ chế `ALLOWED_USER_ID` chỉ chặn thao tác, không làm bot “vô hình”.
- Nên xem Flowork là công cụ tiện lợi cho workspace cá nhân, không phải kênh an toàn để xử lý dữ liệu nhạy cảm.

## Ghi chú kỹ thuật

- State runtime hiện được lưu trong `state/session.json`.
- Build output nằm ở `dist/`.
- Bot kiểm tra `codex` CLI ngay lúc khởi động để tránh chạy nửa chừng.
