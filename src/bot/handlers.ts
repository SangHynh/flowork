import { Bot, InlineKeyboard } from 'grammy';
import * as fs from 'fs';
import * as path from 'path';
import { AgentRunner } from '../agent/runner';
import { logger } from '../utils/logger';
import { ResponseFormatter } from '../utils/formatter';

const runner = new AgentRunner();

// State to track users creating a new folder
const pendingCreations = new Map<number, string>(); // userId -> parentPath
const unauthorizedMessages = [
  'Sai cửa rồi bro ơi, đây không phải bot của bro.',
  'Lượn nhẹ nha, khu này có chủ rồi.',
  'Ấn linh tinh gì thế, bot này không tiếp khách lạ.',
  'Bro không có vé vào cửa đâu, quay xe giúp mình.',
  'Đừng nghịch nữa, bot này đã có chủ rồi.',
  'Mẹ bạn béo.',
  'Não để ở nhà rồi à mà mò vào đây?',
  'Bot này không dành cho người như bro. Thật ra là không dành cho bro luôn.',
  'Ấn nữa đi, ấn nữa xem có gì không. Spoiler: không có gì đâu, giống bro vậy.',
  'Unauthorized. Dịch nôm: CÚT.',
  'Xin lỗi, bot này không hỗ trợ IQ dưới ngưỡng tối thiểu.',
  'Bro vừa waste 3 giây cuộc đời. Chúc mừng.',
  'Hệ thống đã ghi nhận. Cũng không làm gì đâu, nhưng ghi nhận.',
  'Đây là tài sản riêng. Bro đang đứng trước cửa nhà người ta mà không biết.',
  'Thử lần nữa xem sao. (Đừng thử, vô ích lắm.)',
  'Có chí cầu tiến đó, nhưng sai chỗ rồi.',
  'Thằng bé này lỳ thật sự.',
];

function parseCodexError(raw: string): string {
  const text = raw.toLowerCase();

  if (text.includes('401') && text.includes('unauthorized')) {
    return '🔴 Chưa đăng nhập hoặc phiên đã hết hạn.\nDùng /login để đăng nhập lại.';
  }

  if (text.includes('429') || text.includes('rate limit')) {
    return '⏳ Bị rate limit. Đợi một lát rồi thử lại.';
  }

  if (
    text.includes('quota') ||
    text.includes('insufficient') ||
    text.includes('billing')
  ) {
    return '💳 Hết quota hoặc lỗi billing. Kiểm tra tài khoản OpenAI.';
  }

  if (text.includes('500') && text.includes('internal server error')) {
    return '🔥 Server OpenAI đang lỗi (500). Thử lại sau.';
  }

  if (text.includes('usage limit') || text.includes('upgrade to plus')) {
    const timeMatch = raw.match(/try again at (.*)\./i);
    const timeInfo = timeMatch ? `\n⏳ Thử lại vào: *${timeMatch[1]}*` : '';
    return `🚫 *Hết hạn mức sử dụng (Usage Limit)*${timeInfo}\n\nVui lòng nâng cấp gói Plus hoặc đợi đến thời gian trên để tiếp tục.`;
  }

  if (text.includes('timeout') || text.includes('timed out')) {
    return '⏰ Hết thời gian chờ phản hồi. Thử lại.';
  }

  if (text.includes('enotfound') || text.includes('network')) {
    return '🌐 Lỗi kết nối mạng. Kiểm tra internet.';
  }

  // Fallback: trả dòng cuối có ý nghĩa, tối đa 200 ký tự
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('---'));
  const lastMeaningful = lines[lines.length - 1] || raw;
  return lastMeaningful.length > 200
    ? lastMeaningful.slice(0, 200) + '...'
    : lastMeaningful;
}

function parseAllowedUserIds() {
  return new Set(
    (process.env.ALLOWED_USER_ID || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  );
}

function getUnauthorizedMessage() {
  return unauthorizedMessages[
    Math.floor(Math.random() * unauthorizedMessages.length)
  ];
}

function renderExplorer(currentRelPath: string) {
  const projectsDir = process.env.PROJECTS_DIR || 'e:\\fullstack';
  const fullPath = path.join(projectsDir, currentRelPath);

  if (!fs.existsSync(fullPath)) {
    return {
      text: `❌ Đường dẫn không tồn tại: ${currentRelPath}`,
      keyboard: new InlineKeyboard().text('Về gốc', 'explore:'),
    };
  }

  const items = fs
    .readdirSync(fullPath)
    .filter((name) => !name.startsWith('.'))
    .map((name) => {
      const isDir = fs.statSync(path.join(fullPath, name)).isDirectory();
      return { name, isDir };
    });

  const keyboard = new InlineKeyboard();

  // Navigation: Folders first
  const folders = items.filter((i) => i.isDir);
  folders.forEach((f, index) => {
    const relPath = path.join(currentRelPath, f.name).replace(/\\/g, '/');
    keyboard.text(`📁 ${f.name}`, `explore:${relPath}`);
    if ((index + 1) % 2 === 0) keyboard.row();
  });

  if (folders.length > 0) keyboard.row();

  // Action Buttons
  if (currentRelPath !== '' && currentRelPath !== '.') {
    const parent = path.dirname(currentRelPath).replace(/\\/g, '/');
    keyboard.text('⬅️ QUAY LẠI', `explore:${parent === '.' ? '' : parent}`);
  }

  keyboard.text('✅ CHỌN THƯ MỤC NÀY', `select:${currentRelPath}`);
  keyboard.row();
  keyboard.text('🆕 TẠO MỚI', `new_folder:${currentRelPath}`);

  return {
    text: `📂 *Workspace Explorer*\n\n📍 Hiện tại: \`${currentRelPath || '/'}\`\n\nHãy chọn thư mục hoặc bấm "Chọn" để bắt đầu:`,
    keyboard,
  };
}

const helpText = `
🤖 *Flowork Bot - Phím tắt lệnh*
----------------------
📂 /workspaces : Duyệt và chọn nơi làm việc
📋 /list : Xem các file trong project
ℹ️ /status : Xem workspace hiện tại
🛑 /stop : Xóa state phiên hiện tại
🔑 /login : Đăng nhập tài khoản Codex
🚪 /logout : Đăng xuất tài khoản Codex
🔒 /auth\\_status : Kiểm tra trạng thái đăng nhập
❓ /help : Hiện danh sách lệnh này

💬 *Gõ tin nhắn:* Trò chuyện hoặc yêu cầu AI làm việc ngay tại workspace đã chọn.
`;

export function setupHandlers(bot: Bot) {
  const allowedUserIds = parseAllowedUserIds();

  bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId || !allowedUserIds.has(userId)) {
      const message = getUnauthorizedMessage();
      logger.warn(
        `Blocked unauthorized access from user ${userId || 'unknown'}`,
      );

      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: message, show_alert: true });
        return;
      }

      if (ctx.message) {
        await ctx.reply(message);
      }

      return;
    }

    await next();
  });

  // /start command
  bot.command('start', async (ctx) => {
    logger.user('/start', ctx.from?.id);
    await ctx.reply(`🚀 *Chào mừng bạn đến với Flowork!*\n${helpText}`, {
      parse_mode: 'Markdown',
    });
  });

  // /workspaces command
  bot.command('workspaces', async (ctx) => {
    logger.user('/workspaces', ctx.from?.id);
    const { text, keyboard } = renderExplorer('');
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  // Explore callback
  bot.callbackQuery(/^explore:(.*)$/, async (ctx) => {
    const relPath = ctx.match[1];
    await ctx.answerCallbackQuery();
    const { text, keyboard } = renderExplorer(relPath);
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // Select callback
  bot.callbackQuery(/^select:(.*)$/, async (ctx) => {
    const relPath = ctx.match[1];
    const projectsDir = process.env.PROJECTS_DIR || 'e:\\fullstack';
    const workdir = path.join(projectsDir, relPath);

    logger.user(`select workspace: ${relPath}`, ctx.from?.id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `🟢 Đang mở phiên mới tại workspace: \`${relPath || '/'}\``,
      {
        parse_mode: 'Markdown',
      },
    );

    try {
      await runner.startSession(workdir);
      await ctx.reply(
        `✅ Workspace hiện tại: \`${relPath || 'Gốc'}\`\nPhiên mới đã được mở. Hãy gõ lệnh bất kỳ để bắt đầu.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`❌ Lỗi khởi tạo: ${message}`);
    }
  });

  // New folder callback
  bot.callbackQuery(/^new_folder:(.*)$/, async (ctx) => {
    const parentRelPath = ctx.match[1];
    const userId = ctx.from.id;

    pendingCreations.set(userId, parentRelPath);
    await ctx.answerCallbackQuery();

    await ctx.reply(
      `📂 *Tạo thư mục mới*\nTại: \`${parentRelPath || '/'}\`\n\nHãy nhập tên thư mục bạn muốn tạo:`,
      {
        parse_mode: 'Markdown',
        reply_markup: { force_reply: true },
      },
    );
  });

  // /stop command
  bot.command('stop', async (ctx) => {
    logger.user('/stop', ctx.from?.id);
    runner.stopSession();
    await ctx.reply('🛑 Phiên đã kết thúc. Gõ /start để bắt đầu lại.');
  });

  // /status command
  bot.command('status', async (ctx) => {
    logger.user('/status', ctx.from?.id);
    const session = runner.getActiveSession();
    if (session) {
      await ctx.reply(
        `ℹ️ *Trạng thái hiện tại*\n\n📁 Workspace: \`${session.workdir}\``,
        { parse_mode: 'Markdown' },
      );
    } else {
      await ctx.reply('ℹ️ Hiện chưa có workspace nào được chọn.');
    }
  });

  // /list command
  bot.command('list', async (ctx) => {
    logger.user('/list', ctx.from?.id);
    const session = runner.getActiveSession();
    if (!session) {
      return ctx.reply('⚠️ Bạn cần chọn workspace trước bằng lệnh /workspaces');
    }

    try {
      const files = fs
        .readdirSync(session.workdir)
        .filter((f) => !f.startsWith('.'));
      const listText =
        files.length > 0
          ? files.map((f) => `- \`${f}\``).join('\n')
          : '(Thư mục trống)';

      await ctx.reply(
        `📂 *Tệp tin trong \`${path.basename(session.workdir)}\`:*\n\n${listText}`,
        {
          parse_mode: 'Markdown',
        },
      );
    } catch (err) {
      await ctx.reply(`❌ Không thể đọc danh sách file: ${err}`);
    }
  });

  // View file callback
  bot.callbackQuery(/^view_file:(.*)$/, async (ctx) => {
    const filename = ctx.match[1];
    const session = runner.getActiveSession();
    if (!session) {
      return ctx.answerCallbackQuery({
        text: '⚠️ Không có phiên hoạt động.',
        show_alert: true,
      });
    }

    const filePath = path.join(session.workdir, filename);
    if (!fs.existsSync(filePath)) {
      return ctx.answerCallbackQuery({
        text: '❌ File không còn tồn tại.',
        show_alert: true,
      });
    }

    await ctx.answerCallbackQuery();
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = ResponseFormatter.split(content);

      await ctx.reply(`📄 *Nội dung tệp: \`${filename}\`*`, {
        parse_mode: 'Markdown',
      });

      for (const chunk of chunks) {
        await ctx.reply(`\`\`\`\n${chunk}\n\`\`\``, {
          parse_mode: 'Markdown',
        });
      }
    } catch (err) {
      await ctx.reply(`❌ Lỗi đọc file: ${err}`);
    }
  });

  // /new command (placeholder/instruction)
  bot.command('new', async (ctx) => {
    logger.user('/new', ctx.from?.id);
    await ctx.reply(
      '🆕 *Tạo mới dự án*\nBạn hãy dùng /workspaces, sau đó chọn thư mục cha và bấm `🆕 TẠO MỚI` để tạo dự án mới nhé!',
      {
        parse_mode: 'Markdown',
      },
    );
  });

  // /help command
  bot.command('help', async (ctx) => {
    logger.user('/help', ctx.from?.id);
    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  // /logout command
  bot.command('logout', async (ctx) => {
    logger.user('/logout', ctx.from?.id);
    await ctx.reply('⏳ Đang đăng xuất...');
    
    // Non-blocking logout
    runner.codexLogout()
      .then(result => ctx.reply(`✅ ${result}`))
      .catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        ctx.reply(`❌ Lỗi đăng xuất: ${message}`);
      });
  });

  // /login command
  bot.command('login', async (ctx) => {
    logger.user('/login', ctx.from?.id);
    await ctx.reply('⏳ Đang khởi tạo đăng nhập...');

    // Non-blocking login: the promise is handled via .then/.catch
    // allowing the command handler to finish early.
    runner.codexLoginDeviceAuth((url, code) => {
      ctx.reply(
        `🔐 *Đăng nhập Codex*\n\n` +
          `1️⃣ Mở link này trên trình duyệt:\n${url}\n\n` +
          `2️⃣ Nhập mã xác thực:\n\`${code}\`\n\n` +
          `⏰ Mã hết hạn sau 15 phút\n` +
          `⚠️ _Không chia sẻ mã này cho ai._`,
        { parse_mode: 'Markdown' },
      );
    }).then(result => {
      if (result.success) {
        ctx.reply('✅ Đăng nhập Codex thành công! 🎉');
      } else {
        // Only notify if it wasn't a manual cancel or duplicate process
        if (!result.message.includes('đã bị hủy')) {
          ctx.reply(`❌ Lỗi đăng nhập: ${result.message}`);
        }
      }
    }).catch(error => {
      const message = error instanceof Error ? error.message : String(error);
      ctx.reply(`❌ Lỗi tiến trình đăng nhập: ${message}`);
    });
  });

  // /auth_status command
  bot.command('auth_status', async (ctx) => {
    logger.user('/auth_status', ctx.from?.id);
    const status = await runner.codexAuthStatus();
    if (status.loggedIn) {
      await ctx.reply(`🟢 *Đã đăng nhập*\n${status.message}`, {
        parse_mode: 'Markdown',
      });
    } else {
      await ctx.reply(
        `🔴 *Chưa đăng nhập*\n${status.message}\n\nDùng /login để đăng nhập.`,
        { parse_mode: 'Markdown' },
      );
    }
  });

  // Handle all messages
  bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const projectsDir = process.env.PROJECTS_DIR || 'e:\\fullstack';

    // 1. Check if user is creating a folder
    if (pendingCreations.has(userId)) {
      const parentRelPath = pendingCreations.get(userId)!;
      const folderName = ctx.message.text.trim();
      pendingCreations.delete(userId);

      if (
        !folderName ||
        folderName.includes('/') ||
        folderName.includes('\\')
      ) {
        return ctx.reply('❌ Tên thư mục không hợp lệ.');
      }

      const fullPath = path.join(projectsDir, parentRelPath, folderName);
      try {
        if (fs.existsSync(fullPath)) {
          return ctx.reply('⚠️ Thư mục đã tồn tại.');
        }
        fs.mkdirSync(fullPath, { recursive: true });

        await ctx.reply(`✅ Đã tạo thư mục: \`${folderName}\``, {
          parse_mode: 'Markdown',
        });

        // Refresh explorer
        const { text, keyboard } = renderExplorer(parentRelPath);
        await ctx.reply(text, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
        return;
      } catch (err) {
        return ctx.reply(`❌ Lỗi tạo thư mục: ${err}`);
      }
    }

    // 2. Regular message handling
    logger.user(ctx.message.text, ctx.from?.id);
    const session = runner.getActiveSession();
    if (!session) {
      return ctx.reply(
        '⚠️ Hiện chưa có workspace nào được chọn. Gõ /workspaces để chọn một dự án.',
      );
    }

    const prompt = ctx.message.text;
    await ctx.reply('⏳ Đang xử lý...');

    try {
      const start = Date.now();
      const output = await runner.resumeSession(prompt);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      const response = output || '✅ Hoàn tất.';

      logger.bot(response);

      // Detect files in response to show buttons
      const filenames = ResponseFormatter.extractFilenames(response);
      const existingFiles = filenames.filter((f) =>
        fs.existsSync(path.join(session.workdir, f)),
      );

      const chunks = ResponseFormatter.split(response);
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        const text = isLast ? `${chunks[i]}\n\n⏱️ ${duration}s` : chunks[i];

        const keyboard = new InlineKeyboard();
        if (isLast && existingFiles.length > 0) {
          existingFiles.slice(0, 5).forEach((f) => {
            keyboard.text(`📄 Xem ${f}`, `view_file:${f}`);
            keyboard.row();
          });
        }

        try {
          // Attempt with markdown
          await ctx.reply(text, {
            parse_mode: 'Markdown',
            reply_markup:
              keyboard.inline_keyboard.length > 0 ? keyboard : undefined,
          });
        } catch (err) {
          // Fallback to plain text if markdown formatting is invalid
          logger.warn(
            `Markdown formatting failed, falling back to plain text: ${err}`,
          );
          await ctx.reply(text, {
            reply_markup:
              keyboard.inline_keyboard.length > 0 ? keyboard : undefined,
          });
        }
      }
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing message: ${raw}`);
      const friendly = parseCodexError(raw);
      await ctx.reply(`❌ ${friendly}`);
    }
  });
}
