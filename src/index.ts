import * as dotenv from 'dotenv';
import { Bot } from 'grammy';
import { AgentRunner } from './agent/runner';
import { setupHandlers } from './bot/handlers';
import { logger } from './utils/logger';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserId = process.env.ALLOWED_USER_ID;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is missing in .env');
  process.exit(1);
}

if (!allowedUserId) {
  console.error('ALLOWED_USER_ID is missing in .env');
  process.exit(1);
}

const botToken = token;

async function bootstrap() {
  try {
    await AgentRunner.checkCodexAvailability();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Codex CLI is not available: ${message}`);
    process.exit(1);
  }

  const bot = new Bot(botToken);

  setupHandlers(bot);

  logger.system('Bot is starting...');
  await bot.start();
}

void bootstrap();
