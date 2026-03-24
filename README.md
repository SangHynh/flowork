# Flowork `v1.2.1`

<video src="./docs/assets/flowork.mp4" autoplay loop muted playsinline controls style="width:100%"></video>

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

## Các tính năng thông minh mới (v1.2.x)

### 📄 Tự động phát hiện và xem file (Auto View File)

Khi AI nhắc tới một file trong workspace (ví dụ: "mình đã tạo `index.html`"), bot sẽ tự động kiểm tra sự tồn tại của file đó và hiện nút bấm **"📄 Xem index.html"** ngay dưới tin nhắn. Bạn có thể Click để xem nội dung file ngay lập tức.

### 📝 Định dạng thông minh

Bot tự động nhận diện và hiển thị Markdown từ AI (bôi đậm, code block, link). Nếu nội dung quá dài, bot sẽ tự động chia nhỏ thành nhiều tin nhắn để đảm bảo bạn nhận được đầy đủ thông tin mà không bị giới hạn bởi Telegram.

### 🛡️ Xử lý lỗi thân thiện

Thay vì những dòng lỗi CLI khó hiểu, bot sẽ dịch các lỗi phổ biến (401 Unauthorized, 429 Rate Limit, 500 Server Error) sang tiếng Việt và hướng dẫn bạn cách xử lý (ví dụ: nhắc bạn dùng `/login`).

## Đăng nhập từ xa (Login/Logout)

> ⚠️ **Không khuyến khích sử dụng thường xuyên.** Nếu có thể, hãy đăng nhập trực tiếp trên máy bằng `codex login` hoặc `codex login --device-auth` trong terminal.

Bot hỗ trợ đăng nhập và đăng xuất tài khoản Codex từ xa qua Telegram bằng **OAuth Device Code Flow**.

### Yêu cầu bắt buộc trước khi dùng `/login`

Bạn **phải bật tính năng này thủ công** trong cài đặt ChatGPT:
[chatgpt.com](https://chatgpt.com) → avatar → **Settings** → **Security** → Bật **"Device code authorization for Codex"**.

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

## Lịch sử phiên bản (Release History)

| Phiên bản |    Ngày    | Nội dung cập nhật                                                                                                       |
| :-------: | :--------: | :---------------------------------------------------------------------------------------------------------------------- |
| `v1.2.1`  | 24/03/2026 | **UX Excellence**: Thêm Response Formatter (Auto View File buttons, Markdown, Splitting), dịch lỗi CLI sang tiếng Việt. |
| `v1.2.0`  | 24/03/2026 | **Remote Auth**: Thêm lệnh `/login`, `/logout`, `/auth_status` qua Device Auth (OAuth).                                 |
| `v1.1.0`  | 22/03/2026 | **Localization & Explorer**: Tiếng Việt hóa bộ lệnh, thêm `/workspaces`, `/status`, `/stop`, `/list`, `/help`.          |
| `v1.0.1`  | 23/03/2026 | **Initial Release**: Core logic điều khiển Codex CLI qua Telegram, Workspace Explorer cơ bản.                           |

---
