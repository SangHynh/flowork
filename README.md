# Flowork `v1.2.1`

![Flowork Demo](./docs/assets/flowork.gif)

Flowork là bot Telegram giúp bạn điều khiển AI agent từ xa ngay trên máy tính của mình thông qua `codex` CLI. Điểm thực dụng nhất của project là người dùng có thể tận dụng các model mạnh sẵn có trong hệ sinh thái CLI mà không cần tự dựng luồng API riêng, không phải cấu hình phức tạp, và cũng không phải tốn thêm chi phí kiểu gọi API theo request như các cách tích hợp truyền thống.

Mục tiêu của Flowork là biến Telegram thành một chiếc remote điều khiển workspace: bạn chọn đúng thư mục dự án, gửi yêu cầu ngay trong khung chat, và agent sẽ chạy trực tiếp trong workspace đó. Cách này đặc biệt hữu ích khi bạn không ngồi trước máy tính, ví dụ đang ra ngoài, đang ăn uống, đang di chuyển, hoặc chỉ đơn giản là muốn theo dõi và ra lệnh nhanh từ điện thoại mà vẫn giữ được luồng làm việc liên tục.

## Tổng quan nhanh

Flowork hoạt động theo luồng sau:

1. Bot Telegram nhận lệnh và tin nhắn từ tài khoản của bạn.
2. Bạn chọn workspace bằng `/workspaces`.
3. Flowork gọi `codex exec` trong workspace đã chọn.
4. Các tin nhắn tiếp theo sẽ được tiếp tục trong phiên gần nhất bằng `codex exec resume --last`.

## Yêu cầu

Bạn cần chuẩn bị trước:

- Node.js đã cài sẵn
- `npm`
- `codex` CLI (OpenAI Codex CLI) đã cài và có thể gọi bằng lệnh `codex`
- Một Telegram bot token từ [@BotFather](https://t.me/botfather)
- Telegram user id của tài khoản được phép dùng bot

## Cài đặt từng bước

### 1. Clone project

```bash
git clone https://github.com/SangHynh/flowork
cd flowork
```

Nếu bạn đã có source sẵn thì chỉ cần đi vào thư mục dự án.

### 2. Cài Node.js dependencies

```bash
npm install
```

### 3. Cài `codex` CLI

Flowork không tự nhúng model hay API request riêng. Nó gọi trực tiếp `codex` trên máy của bạn, vì vậy bước này là bắt buộc.

Cài đặt bằng `npm` (yêu cầu Node.js v22+):

```bash
npm install -g @openai/codex
```

Hoặc tham khảo hướng dẫn chính thức tại: [OpenAI Codex CLI](https://openai.com/index/openai-codex-cli/)

Sau khi cài xong, kiểm tra lại:

```bash
codex --version
```

Nếu lệnh này không chạy được, Flowork sẽ dừng ngay lúc khởi động.

### 4. Đăng nhập `codex`

Trước khi dùng bot, hãy đăng nhập Codex trên máy tính:

```bash
codex login
```

Nếu máy của bạn phù hợp với device flow, có thể dùng:

```bash
codex login --device-auth
```

Kiểm tra trạng thái đăng nhập:

```bash
codex login status
```

Nếu chưa đăng nhập, bot vẫn có thể khởi động nhưng các yêu cầu AI sẽ thất bại khi gọi `codex`.

### 5. Tạo Telegram bot

Mở Telegram và chat với [@BotFather](https://t.me/botfather):

1. Gửi `/newbot`
2. Đặt tên bot
3. Đặt username cho bot
4. Lưu lại token mà BotFather trả về

Token này sẽ được gán vào `TELEGRAM_BOT_TOKEN` trong file `.env`.

### 6. Lấy Telegram user id của bạn

Bạn cần user id để giới hạn người được phép dùng bot.

Có thể lấy bằng một trong các cách sau:

1. Nhắn cho bot như `@myidbot` hoặc `@userinfobot`
2. Lấy giá trị `user id` mà bot trả về

Lưu ý:

- Dùng `user id`, không dùng username
- Có thể khai báo nhiều user bằng dấu phẩy
- Ví dụ: `ALLOWED_USER_ID=123456789,987654321`

### 7. Tạo file `.env`

Copy từ file mẫu:

```bash
copy .env.sample .env
```

Nếu dùng PowerShell và lệnh `copy` không quen tay, bạn có thể tạo file thủ công. Nội dung tối thiểu:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
ALLOWED_USER_ID=123456789
PROJECTS_DIR=e:\
```

Giải thích:

- `TELEGRAM_BOT_TOKEN`: token của bot từ BotFather
- `ALLOWED_USER_ID`: user id Telegram được phép dùng bot
- `PROJECTS_DIR`: thư mục gốc để bot hiện workspace explorer

Nếu bỏ trống `PROJECTS_DIR`, dự án sẽ mặc định dùng `e:\fullstack`.

### 8. Build project

```bash
npm run build
```

### 9. Chạy bot

```bash
npm start
```

Hoặc khi đang dev:

```bash
npm run dev
```

Khi khởi động thành công, bot sẽ:

- Nạp biến môi trường từ `.env`
- Kiểm tra `TELEGRAM_BOT_TOKEN`
- Kiểm tra `ALLOWED_USER_ID`
- Kiểm tra `codex` CLI có tồn tại hay không

Nếu thiếu một trong các điều kiện trên, tiến trình sẽ thoát ngay.

## Chạy lần đầu trên Telegram

Sau khi bot đang chạy:

1. Mở chat với bot của bạn
2. Gửi `/start`
3. Gửi `/workspaces`
4. Chọn đúng thư mục dự án
5. Gửi một yêu cầu bất kỳ, ví dụ: `đọc README và tóm tắt cho tôi`

Từ lúc này:

- `/status` để xem workspace đang active
- `/list` để xem file trong workspace hiện tại
- `/stop` để xóa phiên hiện tại
- `/help` để xem hướng dẫn nhanh

## Các lệnh hỗ trợ

- `/workspaces`: mở trình duyệt workspace
- `/list`: xem file trong workspace hiện tại
- `/status`: xem workspace đang active
- `/stop`: xóa state hiện tại
- `/help`: hiện hướng dẫn nhanh
- `/new`: hướng dẫn tạo dự án mới từ explorer
- `/login`: đăng nhập tài khoản Codex từ xa
- `/logout`: đăng xuất tài khoản Codex
- `/auth_status`: kiểm tra trạng thái đăng nhập Codex hiện tại

## Đăng nhập từ xa bằng Telegram

Flowork hỗ trợ đăng nhập Codex từ xa qua lệnh `/login`, nhưng nên xem đây là phương án dự phòng.

Khuyến nghị:

- Ưu tiên đăng nhập trực tiếp trên máy bằng `codex login`
- Chỉ dùng `/login` khi bạn đang ở xa máy

Trước khi dùng `/login`, bạn phải bật tính năng device authorization trong tài khoản ChatGPT:

`chatgpt.com` -> avatar -> `Settings` -> `Security` -> Bật `Device code authorization for Codex`

## Sự cố thường gặp

### `TELEGRAM_BOT_TOKEN is missing in .env`

Bạn chưa tạo `.env` hoặc chưa điền token.

### `ALLOWED_USER_ID is missing in .env`

Bạn chưa điền user id Telegram được phép sử dụng bot.

### `Codex CLI is not available`

Máy của bạn chưa cài `codex`, hoặc `codex` chưa có trong `PATH`.

Thử lại:

```bash
codex --version
```

### Bot trả lời là chưa đăng nhập hoặc hết phiên

Hãy đăng nhập lại:

```bash
codex login
```

Hoặc dùng lệnh Telegram:

```text
/login
```

### Bot không phản hồi với tài khoản của bạn

Kiểm tra lại:

- Tài khoản Telegram của bạn có đúng `ALLOWED_USER_ID` hay không
- Bạn đã restart bot sau khi sửa `.env` hay chưa

## Bảo mật và quyền riêng tư

- Bot Telegram không phải hệ thống vô hình. Bất kỳ ai biết username bot đều có thể tìm thấy bot và nhắn tin.
- Chỉ những user nằm trong `ALLOWED_USER_ID` mới được thực hiện command và gửi message hợp lệ.
- Telegram là bên thứ ba, vì vậy không nên xem đây là kênh an toàn để xử lý dữ liệu quá nhạy cảm.
- Không chia sẻ device code, OTP, hay thông tin đăng nhập cho người khác.

## Scripts

`package.json` hiện có các lệnh sau:

```bash
npm run build
npm start
npm run dev
npm run lint
npm run lint:fix
npm run format
```

## Bảo mật và quyền riêng tư

- **Quyền riêng tư:** Bot Telegram **không vô hình** — bất kỳ ai có link hoặc tên bot đều có thể tìm thấy và nhắn tin. Tuy nhiên:
  - Mỗi người dùng chỉ thấy **cuộc trò chuyện của chính họ** với bot, không thể xem lịch sử của người khác. Đây là cơ chế cố định của nền tảng Telegram.
  - Người không có trong `ALLOWED_USER_ID` sẽ bị chặn toàn bộ thao tác ngay lập tức.
- **Bảo mật:**
  - Không chia sẻ mã OTP (Device Code) cho bất kỳ ai. Ưu tiên đăng nhập trực tiếp trên máy tính.
  - Telegram là **bên thứ ba**. Về mặt kỹ thuật, tin nhắn đi qua server của Telegram trước khi đến bot. Telegram có chính sách mã hóa và bảo mật riêng.
  - Nếu tài khoản Telegram của bạn bị lộ hoặc xâm phạm, lịch sử chat với bot cũng có thể bị truy cập.
  - Nên xem Flowork là công cụ tiện lợi cho workspace cá nhân, không phải kênh an toàn để xử lý dữ liệu nhạy cảm.

_Người dùng tự cân nhắc mức độ rủi ro phù hợp với nhu cầu sử dụng của mình._

## Release History

| Version  |    Date    | Nội dung cập nhật                                                                                     |
| :------: | :--------: | :---------------------------------------------------------------------------------------------------- |
| `v1.2.1` | 24/03/2026 | UX improvements: auto view file, markdown formatting, chia nhỏ message, dịch lỗi CLI sang tiếng Việt. |
| `v1.2.0` | 24/03/2026 | Remote auth: thêm `/login`, `/logout`, `/auth_status` qua device auth.                                |
| `v1.1.0` | 23/03/2026 | Localization và workspace explorer: thêm `/workspaces`, `/status`, `/stop`, `/list`, `/help`.         |
| `v1.0.1` | 23/03/2026 | Initial release: điều khiển Codex CLI qua Telegram và workspace explorer cơ bản.                      |
