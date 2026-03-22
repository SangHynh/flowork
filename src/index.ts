import { Bot } from "grammy";
import express from "express";
import { registerHandlers } from "./bot/handlers.js";
import { CONFIG } from "./config/index.js";

// Initialize Express for Health Checks
const app = express();
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(CONFIG.SERVER.PORT, () => {
  console.log(`Kiểm tra sức khỏe hệ thống (Health check) đang chạy tại cổng ${CONFIG.SERVER.PORT}`);
});

// Initialize Telegram Bot
const bot = new Bot(CONFIG.BOT.TOKEN);

bot.command("start", (ctx) =>
  ctx.reply("🤖 Flowork v1.1 đã sẵn sàng! Bạn hãy gửi yêu cầu để bắt đầu nhé."),
);

// Register Refactored Handlers
registerHandlers(bot);

bot.start();
console.log("🚀 Bot đã online và đang lắng nghe...");
