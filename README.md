# 🚀 Flowork — AI Workspace Automation Agent

**Flowork** là một Telegram Bot mạnh mẽ giúp bạn quản lý các dự án lập trình và tự động hóa công việc thông qua trí tuệ nhân tạo (Codex). Với Flowork, bạn có thể duyệt thư mục, tạo dự án mới và ra lệnh cho AI thực thi ngay trên chính ổ đĩa của mình chỉ qua vài dòng chat.

---

## ✨ Tính năng nổi bật (Phase 1++)

- 📁 **Workspace Explorer:** Duyệt cây thư mục trực quan ngay trên Telegram (đi sâu, quay lại, chọn).
- 🆕 **Tạo dự án nhanh:** Tạo thư mục mới ngay lập tức qua tin nhắn `Force Reply`.
- 🤖 **AI Integration:** Trò chuyện và ra lệnh cho AI xử lý code, file trong Workspace đã chọn.
- ⚙️ **Cài đặt linh hoạt:** Tự động bỏ qua kiểm tra Git repo và xử lý lỗi đường dẫn thực thi của AI.
- 🔒 **Bảo mật:** Chỉ cho phép người dùng có ID được cấu hình (`ALLOWED_USER_ID`) sử dụng.

---

## 🛠️ Hướng dẫn cài đặt

### 1. Tạo Bot Telegram

1. Tìm kiếm và chat với [@BotFather](https://t.me/botfather).
2. Gõ lệnh `/newbot` và làm theo hướng dẫn để đặt tên Bot.
3. Sau khi tạo xong, bạn sẽ nhận được một đoạn **API Token** (VD: `123456:ABC-DEF...`). Hãy lưu lại.

### 2. Lấy ID Telegram của bạn

1. Chat với [@userinfobot](https://t.me/userinfobot) để lấy **User ID** (VD: `6471128538`). 
2. Đây là bước quan trọng để chỉ duy nhất bạn mới có quyền điều khiển Bot.

### 3. Cấu hình Dự án

1. Clone dự án về máy:
   ```bash
   git clone <link-repo-cua-ban>
   cd flowork
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Tạo file cấu hình `.env`:
   - Copy file mẫu: `cp .env.sample .env` (hoặc copy nội dung thủ công).
   - Điền **API Token** và **User ID** của bạn vào file `.env`.
   - Chỉnh sửa `PROJECT_DIR` trỏ về thư mục chứa các dự án của bạn (mặc định là `e:/fullstack`).

### 4. Khởi động

1. Biên dịch dự án:
   ```bash
   npm run build
   ```
2. Chạy Bot:
   ```bash
   npm start
   ```

---

## 📖 Hướng dẫn sử dụng

| Lệnh | Mô tả |
|---|---|
| `/workspaces` | Mở trình duyệt thư mục để chọn nơi làm việc |
| `/list` | Xem nhanh danh sách file trong dự án hiện tại |
| `/status` | Xem bạn đang ở Workspace nào và thời gian làm việc |
| `/stop` | Kết thúc phiên làm việc để chọn Workspace khác |
| `/help` | Hiện danh sách lệnh trợ giúp này |

**Quy trình làm việc:**
1. Dùng `/workspaces` -> Duyệt thư mục -> Bấm `✅ CHỌN THƯ MỤC NÀY`.
2. AI sẽ khởi động tại thư mục đó. 
3. Bạn chỉ cần chat yêu cầu (VD: "Tạo file index.html có hiệu ứng tuyết rơi"), AI sẽ thực thi ngay lập tức.
4. Muốn tạo folder mới? Dùng nút `🆕 TẠO MỚI` trong `/workspaces`.

---

## 🏗️ Công nghệ sử dụng

- **Core:** Node.js, TypeScript.
- **Bot Framework:** [GrammY](https://grammy.dev/).
- **AI Agent:** Codex CLI (Dùng `spawn` process để thực thi lệnh trực tiếp).
- **Logger:** Custom Logger (Console & File).

---

## ⚡ Lộ trình phát triển (Roadmap)

- [x] Phase 1: Bare minimum (Workspace Explorer & Simple Chat).
- [ ] Phase 2: Checklist & Progress Tracker.
- [ ] Phase 3: Git Integration & Auto Deployment.
- [ ] Phase 4: Multi-agent Collaboration.

---

*Chúc bạn có những trải nghiệm làm việc hiệu quả cùng Flowork!*
