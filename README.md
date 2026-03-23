# Flowork `v1.0.0`

Flowork là bot Telegram để chọn workspace trên máy và gửi yêu cầu cho AI agent chạy trực tiếp trong thư mục đó qua `codex` CLI.

## Cài đặt

1. Cài `codex` CLI trên máy và bảo đảm lệnh `codex` chạy được trong terminal.
2. Tạo bot Telegram qua [@BotFather](https://t.me/botfather) và lấy token.
3. Tạo file `.env`:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
ALLOWED_USER_ID=123456789
PROJECTS_DIR=e:\
```

Ghi chú:

- `ALLOWED_USER_ID` là Telegram user id được phép dùng bot.
- Có thể dùng nhiều user id bằng dấu phẩy, ví dụ `ALLOWED_USER_ID=123456789,987654321`.
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
3. Các tin nhắn gửi tiếp theo sẽ được resume trong workspace hiện tại.
4. Dùng `/stop` để xóa state hiện tại. Muốn làm tiếp thì chọn workspace lại.
5. Người lạ không nằm trong `ALLOWED_USER_ID` sẽ bị chặn toàn bộ command, callback và message.

## Lệnh hỗ trợ

- `/workspaces`: mở trình duyệt workspace
- `/list`: xem file trong workspace hiện tại
- `/status`: xem workspace đang active
- `/stop`: xóa state hiện tại
- `/help`: hiện hướng dẫn nhanh
- `/new`: hướng dẫn tạo dự án mới từ explorer

## Ghi chú

- Workspace mặc định lấy từ `PROJECTS_DIR`, nếu không đặt thì dùng `e:\fullstack`.
- State runtime được lưu trong `state/session.json`.
- Build output nằm ở `dist/`.
