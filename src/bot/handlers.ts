import { Bot } from 'grammy';
import { AgentRunner } from '../agent/runner';

const runner = new AgentRunner();

export function setupHandlers(bot: Bot) {
  // /start command
  bot.command('start', async (ctx) => {
    await ctx.reply('🟢 Flowork online. Đang khởi tạo phiên làm việc mới...');
    try {
      const output = await runner.startSession(
        'Mày là Flowork Agent. Hãy giới thiệu bản thân ngắn gọn.',
      );
      await ctx.reply('✅ Phiên mới đã sẵn sàng. Gõ lệnh bất kỳ để bắt đầu.');
      if (output) await ctx.reply(output);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`❌ Lỗi khởi tạo: ${message}`);
    }
  });

  // /stop command
  bot.command('stop', async (ctx) => {
    runner.stopSession();
    await ctx.reply('🛑 Phiên kết thúc. Gõ /start để bắt đầu lại.');
  });

  // /status command
  bot.command('status', async (ctx) => {
    const session = runner.getActiveSession();
    if (session) {
      await ctx.reply(
        `ℹ️ Session đang chạy: ${session.sessionId}\nBắt đầu lúc: ${session.startedAt}`,
      );
    } else {
      await ctx.reply('ℹ️ Hiện không có session nào đang chạy.');
    }
  });

  // /clear command
  bot.command('clear', async (ctx) => {
    // Logic for clear will be implemented in Phase 5, but let's add placeholder
    await ctx.reply('🧹 Workspace đã được reset (giả định).');
  });

  // Handle all other messages
  bot.on('message:text', async (ctx) => {
    const session = runner.getActiveSession();
    if (!session) {
      return ctx.reply('⚠️ Hiện chưa có session nào. Gõ /start để bắt đầu.');
    }

    const prompt = ctx.message.text;
    await ctx.reply('⏳ Đang xử lý...');

    try {
      const output = await runner.resumeSession(prompt);
      await ctx.reply(output || '✅ Hoàn tất.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.reply(`❌ Lỗi: ${message}`);
    }
  });
}
