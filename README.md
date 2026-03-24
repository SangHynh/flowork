# Flowork `v1.1.0`

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
- Nếu không cấu hình `PROJECTS_DIR`, bot sẽ mặc định dùng `e:\\fullstack`.
- Bot sẽ dừng ngay khi khởi động nếu thiếu `TELEGRAM_BOT_TOKEN`, thiếu `ALLOWED_USER_ID`, hoặc không tìm thấy `codex`.

### Cách lấy `ALLOWED_USER_ID`

Bạn có thể lấy Telegram user id của mình bằng một trong các cách sau:

1. Nhắn cho bot như `@myidbot`, `@userinfobot`, hoặc bot tương tự và lấy số `user id` mà bot trả về.
2. Dùng một bot helper bất kỳ có chức năng trả `Your ID` hoặc `user_id`.

Lưu ý:

- Cần lấy `user id` của chính tài khoản Telegram của bạn.
- Không dùng username, số điện thoại, hoặc chat id nhóm để điền vào `ALLOWED_USER_ID`.

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
- `/login`: đăng nhập tài khoản Codex từ xa _(xem lưu ý bên dưới)_
- `/logout`: đăng xuất tài khoản Codex
- `/auth_status`: kiểm tra trạng thái đăng nhập Codex hiện tại

## Đăng nhập từ xa (Login/Logout)

> ⚠️ **Không khuyến khích sử dụng thường xuyên.** Nếu có thể, hãy đăng nhập trực tiếp trên máy bằng `codex login` hoặc `codex login --device-auth` trong terminal.

Bot hỗ trợ đăng nhập và đăng xuất tài khoản Codex từ xa qua Telegram, tiện cho trường hợp token hết giữa chừng và bạn đang không ngồi trước máy tính.

### Cách dùng

1. Gõ `/login` trong chat với bot.
2. Bot sẽ gửi về một **đường link** và một **mã xác thực một lần (OTP)**.
3. Mở link trên trình duyệt điện thoại, đăng nhập tài khoản, nhập mã OTP.
4. Bot sẽ báo đăng nhập thành công sau khi xác thực xong.
5. Để đăng xuất, dùng `/logout`.

### Yêu cầu bắt buộc trước khi dùng `/login`

Tính năng này dùng **OAuth Device Code Flow** của OpenAI. Trước khi chạy lần đầu, bạn **phải bật tính năng này thủ công** trong cài đặt ChatGPT:

1. Vào [chatgpt.com](https://chatgpt.com) → click avatar → **Settings**.
2. Vào tab **Security** (Bảo mật).
3. Tìm mục **"Device code authorization for Codex"** → **Bật lên**.

Nếu chưa bật, OpenAI sẽ từ chối xác thực ngay cả khi bạn mở đúng link.

### Lưu ý bảo mật khi dùng login từ xa

- **Mã OTP chỉ dùng một lần và hết hạn sau 15 phút.** Nếu không kịp xác thực, gõ `/login` lại để lấy mã mới.
- **Không chia sẻ mã OTP với bất kỳ ai**, kể cả người tự xưng là hỗ trợ kỹ thuật. Device code là mục tiêu phishing phổ biến.
- Quá trình đăng nhập gửi link và mã OTP qua Telegram — tức là thông tin này đi qua server của Telegram. Nếu tài khoản Telegram của bạn bị xâm phạm, mã có thể bị lộ.
- Vì lý do trên, **nên ưu tiên đăng nhập trực tiếp trên máy** hơn là qua bot khi có điều kiện.

## Bảo mật và giới hạn

- Đây là bot điều khiển agent trên máy thật. Chỉ nên cấp quyền cho user bạn tin tưởng.
- Không nên chia sẻ token bot, file `.env`, hoặc Telegram user id được cấp quyền.
- Không nên gửi thông tin nhạy cảm qua bot, ví dụ mật khẩu, private key, API key, cookie, dữ liệu khách hàng, hoặc tài liệu nội bộ quan trọng.
- Không nên dùng bot để đọc, trích xuất, sao chép, hoặc gửi ra ngoài các dữ liệu mà bạn không muốn lộ.

### Về quyền riêng tư trên Telegram

Bot Telegram **không vô hình** — bất kỳ ai có link hoặc tên bot đều có thể tìm thấy và nhắn tin. Tuy nhiên:

- Mỗi người dùng chỉ thấy **cuộc trò chuyện của chính họ** với bot, không thể xem lịch sử của người khác. Đây là cơ chế cố định của nền tảng Telegram.
- Người không có trong `ALLOWED_USER_ID` sẽ bị chặn toàn bộ thao tác ngay lập tức.

Dù vậy, cần lưu ý:

- Telegram là **bên thứ ba**. Về mặt kỹ thuật, tin nhắn đi qua server của Telegram trước khi đến bot. Telegram có chính sách mã hóa và bảo mật riêng.
- Nếu tài khoản Telegram của bạn bị lộ hoặc xâm phạm, lịch sử chat với bot cũng có thể bị truy cập.
- Nên xem Flowork là công cụ tiện lợi cho workspace cá nhân, không phải kênh an toàn để xử lý dữ liệu nhạy cảm.

Người dùng tự cân nhắc mức độ rủi ro phù hợp với nhu cầu sử dụng của mình.

## Ghi chú kỹ thuật

- State runtime hiện được lưu trong `state/session.json`.
- Build output nằm ở `dist/`.
- Bot kiểm tra `codex` CLI ngay lúc khởi động để tránh chạy nửa chừng.
- `codex login --device-auth` là luồng OAuth Device Code tiêu chuẩn — bot chỉ parse và chuyển tiếp link/mã OTP, không lưu trữ thông tin xác thực.
