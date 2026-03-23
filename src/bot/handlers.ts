import { Bot, InlineKeyboard } from 'grammy';
import * as fs from 'fs';
import * as path from 'path';
import { AgentRunner } from '../agent/runner';
import { logger } from '../utils/logger';

const runner = new AgentRunner();

export function setupHandlers(bot: Bot) {
  // /start command
  bot.command('start', async (ctx) => {
    logger.user('/start', ctx.from?.id);
    const helpText = `
🚀 *Chào mừng bạn đến với Flowork!*

Hãy dùng lệnh:
- /workspaces: Để chọn dự án bạn muốn làm việc
- /help: Để xem danh sách tất cả các lệnh
    `;
    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  // /workspaces command (formerly part of /start)
  bot.command('workspaces', async (ctx) => {
    logger.user('/workspaces', ctx.from?.id);
    const projectsDir = process.env.PROJECTS_DIR || 'e:\\';

    if (!fs.existsSync(projectsDir)) {
      return ctx.reply(`❌ Thư mục dự án không tồn tại: ${projectsDir}`);
    }

    const folders = fs.readdirSync(projectsDir).filter((name) => {
      try {
        return (
          fs.statSync(path.join(projectsDir, name)).isDirectory() &&
          !name.startsWith('.')
        );
      } catch {
        return false;
      }
    });

    if (folders.length === 0) {
      return ctx.reply('ℹ️ Không tìm thấy dự án nào trong thư mục này.');
    }

    const keyboard = new InlineKeyboard();
    folders.forEach((folder, index) => {
      keyboard.text(folder, `ws:${folder}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });

    await ctx.reply(
      '📂 *Danh sách Project*\nHãy chọn workspace bạn muốn làm việc:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
    );
  });

  // Workspace selection callback
  bot.callbackQuery(/^ws:(.+)$/, async (ctx) => {
    const folder = ctx.match[1];
    const projectsDir = process.env.PROJECTS_DIR || 'e:\\fullstack';
    const workdir = path.join(projectsDir, folder);

    logger.user(`select workspace: ${folder}`, ctx.from?.id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `🟢 Đang khởi tạo phiên làm việc tại: \`${folder}\``,
      {
        parse_mode: 'Markdown',
      },
    );

    try {
      runner.startSession(workdir);
      await ctx.reply(
        `✅ Phiên làm việc mới đã sẵn sàng tại: \`${folder}\`\nHãy gõ lệnh bất kỳ để bắt đầu.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`❌ Lỗi khởi tạo: ${message}`);
    }
  });

  // /stop command
  bot.command('stop', async (ctx) => {
    logger.user('/stop', ctx.from?.id);
    runner.stopSession();
    await ctx.reply('🛑 Phiên kết thúc. Gõ /workspaces để bắt đầu lại.');
  });

  // /status command
  bot.command('status', async (ctx) => {
    logger.user('/status', ctx.from?.id);
    const session = runner.getActiveSession();
    if (session) {
      await ctx.reply(
        `ℹ️ *Trạng thái phiên*\n\n📁 Workspace: \`${session.workdir}\`\n📅 Bắt đầu: ${session.startedAt}`,
        { parse_mode: 'Markdown' },
      );
    } else {
      await ctx.reply('ℹ️ Hiện không có session nào đang chạy.');
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

  // /new command (placeholder)
  bot.command('new', async (ctx) => {
    logger.user('/new', ctx.from?.id);
    await ctx.reply(
      '🆕 *Tính năng đang phát triển*\nĐể tạo project mới, bạn hãy trực tiếp tạo thư mục trong `e:\\fullstack` nhé!',
      {
        parse_mode: 'Markdown',
      },
    );
  });

  // /help command
  bot.command('help', async (ctx) => {
    logger.user('/help', ctx.from?.id);
    const helpText = `
🤖 *Flowork Bot - Phím tắt lệnh*
----------------------
📂 /workspaces : Chọn dự án làm việc
📋 /list : Xem các file trong project
ℹ️ /status : Xem trạng thái phiên hiện tại
🛑 /stop : Kết thúc phiên làm việc
❓ /help : Hiện danh sách lệnh này

💬 *Gõ tin nhắn:* Trò chuyện hoặc yêu cầu AI làm việc ngay tại workspace đã chọn.
    `;
    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  // /clear command
  bot.command('clear', async (ctx) => {
    logger.user('/clear', ctx.from?.id);
    // Logic for clear will be implemented in Phase 5, but let's add placeholder
    await ctx.reply('🧹 Workspace đã được reset (giả định).');
  });

  // Handle all other messages
  bot.on('message:text', async (ctx) => {
    logger.user(ctx.message.text, ctx.from?.id);
    const session = runner.getActiveSession();
    if (!session) {
      return ctx.reply(
        '⚠️ Hiện chưa có session nào. Gõ /workspaces để chọn một dự án.',
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
