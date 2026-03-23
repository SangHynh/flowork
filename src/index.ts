import * as dotenv from 'dotenv';
import { Bot } from 'grammy';
import { setupHandlers } from './bot/handlers';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is missing in .env');
  process.exit(1);
}

const bot = new Bot(token);

setupHandlers(bot);

console.log('Bot is starting...');

bot.start();
