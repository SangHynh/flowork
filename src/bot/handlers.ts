import { Bot, InlineKeyboard } from 'grammy';
import * as fs from 'fs';
import * as path from 'path';
import { AgentRunner } from '../agent/runner';
import { logger } from '../utils/logger';

const runner = new AgentRunner();

// State to track users creating a new folder
const pendingCreations = new Map<number, string>(); // userId -> parentPath
const unauthorizedMessages = [
  'Sai cửa rồi bạn ơi, đây không phải bot của bạn.',
  'Lượn nhẹ nha, khu này có chủ rồi.',
  'Ấn linh tinh gì thế, bot này không tiếp khách lạ.',
  'Bạn không có vé vào cửa đâu, quay xe giúp mình.',
  'Đừng nghịch nữa, bot này đang bận phục vụ chủ nhân.',
];

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
          ? files.map((f) => `- ${f}`).join('\n')
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
      await ctx.reply(`${response}\n\n⏱️ ${duration}s`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing message: ${message}`);
      await ctx.reply(`❌ Lỗi: ${message}`);
    }
  });
}
