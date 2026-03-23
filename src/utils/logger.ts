import chalk from 'chalk';

export const logger = {
  info: (msg: string) => console.log(chalk.white(`[INFO] ${msg}`)),
  success: (msg: string) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  warn: (msg: string) => console.log(chalk.yellow(`[WARN] ${msg}`)),
  error: (msg: string) => console.log(chalk.red(`[ERROR] ${msg}`)),
  bot: (msg: string) => console.log(chalk.blue(`[BOT] ${msg}`)),
  user: (msg: string, userId?: number | string) =>
    console.log(chalk.cyan(`[USER${userId ? ` ${userId}` : ''}] ${msg}`)),
  agent: (msg: string) => console.log(chalk.magenta(`[AGENT] ${msg}`)),
  system: (msg: string) => console.log(chalk.gray(`[SYSTEM] ${msg}`)),
};
