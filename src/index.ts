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
  console.log(`Express health check running on port ${CONFIG.SERVER.PORT}`);
});

// Initialize Telegram Bot
const bot = new Bot(CONFIG.BOT.TOKEN);

bot.command("start", (ctx) =>
  ctx.reply("Flowork autonomous engine online. Send me a task to begin."),
);

// Register Refactored Handlers
registerHandlers(bot);

bot.start();
console.log("Bot running...");
