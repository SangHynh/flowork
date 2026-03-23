import { Bot } from 'grammy';
import { AgentRunner } from '../agent/runner';
import { logger } from '../utils/logger';

const runner = new AgentRunner();

export function setupHandlers(bot: Bot) {
  // /start command
  bot.command('start', async (ctx) => {
    logger.user('/start', ctx.from?.id);
    await ctx.reply('🟢 Flowork online. Đang khởi tạo phiên làm việc mới...');
    try {
      const start = Date.now();
      const output = await runner.startSession(
        'Bạn là Flowork Agent. Hãy giới thiệu bản thân ngắn gọn.',
      );
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      await ctx.reply('✅ Phiên mới đã sẵn sàng. Gõ lệnh bất kỳ để bắt đầu.');
      if (output) await ctx.reply(`${output}\n\n⏱️ ${duration}s`);
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
