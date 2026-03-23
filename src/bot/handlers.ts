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
    const projectsDir = process.env.PROJECTS_DIR || 'e:\\fullstack';
    
    if (!fs.existsSync(projectsDir)) {
      return ctx.reply(`❌ Thư mục dự án không tồn tại: ${projectsDir}`);
    }

    const folders = fs.readdirSync(projectsDir).filter((name) => {
      return fs.statSync(path.join(projectsDir, name)).isDirectory() && !name.startsWith('.');
    });

    if (folders.length === 0) {
      return ctx.reply('ℹ️ Không tìm thấy dự án nào trong thư mục này.');
    }

    const keyboard = new InlineKeyboard();
    folders.forEach((folder, index) => {
      keyboard.text(folder, `ws:${folder}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });

    await ctx.reply('🚀 *Flowork Online*\nHãy chọn workspace bạn muốn làm việc:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // Workspace selection callback
  bot.callbackQuery(/^ws:(.+)$/, async (ctx) => {
    const folder = ctx.match[1];
    const projectsDir = process.env.PROJECTS_DIR || 'e:\\fullstack';
    const workdir = path.join(projectsDir, folder);

    logger.user(`select workspace: ${folder}`, ctx.from?.id);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`🟢 Đang khởi tạo phiên làm việc tại: \`${folder}\``, {
      parse_mode: 'Markdown',
    });

    try {
      runner.startSession(workdir);
      await ctx.reply(`✅ Phiên làm việc mới đã sẵn sàng tại: \`${folder}\`\nHãy gõ lệnh bất kỳ để bắt đầu.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`❌ Lỗi khởi tạo: ${message}`);
    }
  });

  // /stop command
  bot.command('stop', async (ctx) => {
    logger.user('/stop', ctx.from?.id);
    runner.stopSession();
    await ctx.reply('🛑 Phiên kết thúc. Gõ /start để bắt đầu lại.');
  });

  // /status command
  bot.command('status', async (ctx) => {
    logger.user('/status', ctx.from?.id);
    const session = runner.getActiveSession();
    if (session) {
      await ctx.reply(
        `ℹ️ Session đang chạy: ${session.sessionId}\nBắt đầu lúc: ${session.startedAt}`,
      );
    } else {
      await ctx.reply('ℹ️ Hiện không có session nào đang chạy.');
    }
  });

  // /help command
  bot.command('help', async (ctx) => {
    logger.user('/help', ctx.from?.id);
    const helpText = `
🤖 *Flowork Bot Help*
----------------------
🚀 \`/start\`: Khởi tạo phiên làm việc mới
🛑 \`/stop\`: Kết thúc phiên hiện tại
ℹ️ \`/status\`: Xem trạng thái phiên
🧹 \`/clear\`: Dọn dẹp workspace
❓ \`/help\`: Hiển thị danh sách này
📦 \`/ship\`: Gửi file kết quả

💬 Gõ tin nhắn bất kỳ để trò chuyện trực tiếp với AI Nam.
⏱️ Mọi phản hồi đều đi kèm thời gian thực hiện.
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
      return ctx.reply('⚠️ Hiện chưa có session nào. Gõ /start để bắt đầu.');
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
