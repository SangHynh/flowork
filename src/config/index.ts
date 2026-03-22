import "dotenv/config";

export const CONFIG = {
  BOT: {
    TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  },
  SERVER: {
    PORT: Number(process.env.PORT) || 3000,
  },
  WORKFLOW: {
    MODELS: {
      DEFAULT: "gemini-3-flash-preview", // worker model
      PLANNER: "gemini-3.1-pro-preview", // planner model
    },
    TIMEOUTS: {
      RUNNER_MS: 180000, // 3 minutes
    },
    CONCURRENCY: {
      MAX_TASKS: 3,
    },
    RETRIES: {
      MAX: 2, // Try 2 more times (total 3 attempts)
    },
    STORAGE_PATH: ".data/workflows/",
    FACTORY_PATH: ".agent/factory/", // Production area for agents
    MATERIAL_PATH: ".agent/material/", // Input materials for agents
    DESKTOP_PATH: process.env.USER_DESKTOP || "C:/Users/SangPC/Desktop", // Fallback for local dev
  },
};

if (!CONFIG.BOT.TOKEN) {
  console.error("Thiếu TELEGRAM_BOT_TOKEN trong biến môi trường (.env).");
  process.exit(1);
}
