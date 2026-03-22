import { WorkflowEngine } from "../workflow/engine.js";
import { Planner } from "../workflow/planner.js";
import { Storage } from "../workflow/storage.js";
import { FactoryTools } from "../workflow/tools.js";
import { Task } from "../types/index.js";
import { CONFIG } from "../config/index.js";
import { Bot, Context } from "grammy";
import path from "path";
import fs from "fs/promises";

export const activeEngines = new Map<number, WorkflowEngine>();

/**
 * Common update logic for bot handlers when a task changes.
 */
async function onTaskUpdate(ctx: Context, task: Task) {
  console.log(`[Bot] Task ${task.id} update: ${task.status}`);
  if (task.status === "running") {
    await ctx.reply(`⏳ Running: ${task.description}... (Attempt ${task.retries + 1}/${3})`);
  }
}

/**
 * Common notify logic for bot handlers when a phase completes.
 */
async function onPhaseComplete(ctx: Context, phaseId: number, tasks: Task[], totalPhases: number) {
  let phaseReport = `✅ **Phase ${phaseId} Complete!**\n\n`;
  tasks.forEach((t) => {
    phaseReport += `**${t.description}**:\n${t.output || "(No output)"}\n\n`;
  });

  if (phaseId < totalPhases) {
    phaseReport +=
      "⏸ **Workflow Paused.** Use /continue to proceed to next phase, or /abort to stop.";
  }

  await ctx.reply(phaseReport);
}

/**
 * Register all Telegram Bot handlers.
 */
export function registerHandlers(bot: Bot) {
  bot.command("help", async (ctx) => {
    const helpMsg = `🇻🇳 **TIẾNG VIỆT**
🤖 **Flowork - Động cơ Tự hành v1.1**

**Lệnh cốt lõi:**
- \`/approve\` : Duyệt kế hoạch và bắt đầu chạy.
- \`/continue\` : Tiếp tục Phase tiếp theo.
- \`/abort\` : Dừng workflow và xóa trạng thái tạm.
- \`/status\` : Kiểm tra tiến độ hiện tại.

**Công cụ Nhà máy:**
- \`/ship\` : Đóng gói FILE ra Desktop & gửi vào Telegram.
- \`/shot\` : Chụp màn hình máy tính nhanh.
- \`/clean\` : Dọn dẹp sạch sẽ Factory & Material.

**Quản trị:**
- \`/killall\` : Dừng tất cả các task trên mọi Chat.

---

🇺🇸 **ENGLISH**
🤖 **Flowork - Autonomous Engine v1.1**

**Core Commands:**
- \`/approve\` : Approve plan and start execution.
- \`/continue\` : Proceed to the next phase.
- \`/abort\` : Stop workflow and clear state.
- \`/status\` : Check current progress.

**Factory Tools:**
- \`/ship\` : Pack ALL to Desktop & send files here.
- \`/shot\` : Take a quick desktop snapshot.
- \`/clean\` : Wipe factory & material storage.

**Admin:**
- \`/killall\` : Termination for all active workflows.

Simply send a text message to start! / Chỉ cần gửi tin nhắn để bắt đầu! 🧠🚀`;
    await ctx.reply(helpMsg);
  });

  // --- Checkpoint: Restore sessions on startup ---
  Storage.init().then(async () => {
    const activeChats = await Storage.listActiveChats();
    console.log(`[Bot] Restoring ${activeChats.length} active sessions...`);

    for (const chatId of activeChats) {
      const state = await Storage.loadState(chatId);
      if (
        state &&
        (state.status === "running" || state.status === "paused" || state.status === "planning")
      ) {
        console.log(`[Bot] Restoring session for chat: ${chatId}`);

        const engine = new WorkflowEngine(
          state.dag,
          chatId,
          async (task: Task) => {
            if (task.status === "running") {
              await bot.api.sendMessage(
                chatId,
                `⏳ Running: ${task.description}... (Retries: ${task.retries})`,
              );
            }
          },
          async (phaseId: number) => {
            const report = `✅ Phase ${phaseId} Complete!\n\nUse /continue or /abort.`;
            await bot.api.sendMessage(chatId, report);
          },
          state,
        );

        activeEngines.set(chatId, engine);

        // Auto-resume if it was running
        if (state.status === "running") {
          engine.execute().catch(console.error);
        }
      }
    }
  });

  bot.command("approve", async (ctx) => {
    const engine = activeEngines.get(ctx.chat.id);
    if (!engine) return ctx.reply("No active workflow to approve.");

    engine.resolveApproval();
    await ctx.reply("🚀 Plan approved. Starting execution...");
  });

  bot.command("continue", async (ctx) => {
    const engine = activeEngines.get(ctx.chat.id);
    if (!engine || engine.getState().status !== "paused") {
      return ctx.reply("Workflow is not paused.");
    }

    engine.resolveApproval();
    await ctx.reply("⏭ Continuing to next phase...");
  });

  bot.command("abort", async (ctx) => {
    const engine = activeEngines.get(ctx.chat.id);
    if (!engine) return ctx.reply("No active workflow to abort.");

    engine.resolveAbort("Aborted by user via command.");
    activeEngines.delete(ctx.chat.id);
    await Storage.deleteState(ctx.chat.id);
    await ctx.reply("🛑 Workflow aborted and history cleared.");
  });

  bot.command("killall", async (ctx) => {
    let count = 0;
    for (const [id, engine] of activeEngines.entries()) {
      engine.resolveAbort("System-wide kill triggered.");
      await Storage.deleteState(id);
      count++;
    }
    activeEngines.clear();
    await ctx.reply(`💀 Total killed: ${count} active workflows.`);
  });

  bot.command("status", async (ctx) => {
    const engine = activeEngines.get(ctx.chat.id);
    if (!engine) return ctx.reply("No active workflow in this chat.");

    const state = engine.getState();
    await ctx.reply(
      `📊 **Current Status:**\n- State: ${state.status}\n- Phase: ${state.currentPhaseIndex + 1}/${state.dag.phases.length}`,
    );
  });

  bot.command("ship", async (ctx) => {
    const { InputFile } = await import("grammy");

    try {
      const projectFolder = await FactoryTools.shipAll();
      const folderName = path.basename(projectFolder);

      await ctx.reply(
        `📦 **GIAO HÀNG THÀNH CÔNG!** 🚀\n\nToàn bộ sản phẩm đã được đóng gói trong thư mục:\n📂 \`${folderName}\` trên Desktop.`,
      );

      // Selective Telegram Delivery: Let's send human-friendly files (.txt, .md, .pdf, .json, .csv, and images)
      const files = await fs.readdir(CONFIG.WORKFLOW.FACTORY_PATH);
      const legibleExtensions = [".txt", ".md", ".json", ".pdf", ".csv", ".jpg", ".png", ".webp"];

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (legibleExtensions.includes(ext)) {
          const fullPath = path.join(CONFIG.WORKFLOW.FACTORY_PATH, file);
          await ctx.replyWithDocument(new InputFile(fullPath), {
            caption: `📎 Thành phẩm: ${file}`,
          });
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      await ctx.reply(`❌ Ship failed: ${err.message}`);
    }
  });

  bot.command("shot", async (ctx) => {
    try {
      const photoPath = await FactoryTools.snapshot();
      const { InputFile } = await import("grammy");
      await ctx.replyWithPhoto(new InputFile(photoPath), {
        caption: "📷 Desktop Snapshot",
      });
    } catch (error: unknown) {
      const err = error as Error;
      await ctx.reply(`❌ Snapshot failed: ${err.message}`);
    }
  });

  bot.command("clean", async (ctx) => {
    try {
      const msg = await FactoryTools.clean();
      await ctx.reply(msg);
    } catch (error: unknown) {
      const err = error as Error;
      await ctx.reply(`❌ Clean failed: ${err.message}`);
    }
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return;

    if (activeEngines.has(ctx.chat.id)) {
      activeEngines.get(ctx.chat.id)?.resolveAbort("New task started.");
      activeEngines.delete(ctx.chat.id);
      await Storage.deleteState(ctx.chat.id);
    }

    const statusMsg = await ctx.reply("🧠 Planning workflow...");

    try {
      const dag = await Planner.generateDAG(text);

      let planSummary = "📝 **Proposed Plan:**\n\n";
      dag.phases.forEach((phase) => {
        planSummary += `**Phase ${phase.id}**:\n`;
        phase.tasks.forEach((t) => {
          planSummary += `- ${t.description} (Agent: ${t.agent})\n`;
          t.retries = 0; // Initialize retries
        });
        planSummary += "\n";
      });
      planSummary += "Use /approve to start, or /abort to cancel.";

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, planSummary);

      const engine = new WorkflowEngine(
        dag,
        ctx.chat.id,
        (task) => onTaskUpdate(ctx, task),
        (phaseId, tasks) => onPhaseComplete(ctx, phaseId, tasks, dag.phases.length),
      );

      activeEngines.set(ctx.chat.id, engine);
      await Storage.saveState(engine.getState());

      engine
        .execute()
        .then(async () => {
          const state = engine.getState();
          if (state.status === "done") {
            await ctx.reply("🏁 **Workflow Finished Successfully!**");
            activeEngines.delete(ctx.chat.id);
            await Storage.deleteState(ctx.chat.id);
          }
        })
        .catch(async (err: unknown) => {
          const error = err as Error;
          console.error("Engine Error:", error);
          await ctx.reply(`❌ **Workflow Failed!**\n\nError: ${error.message}`);
          activeEngines.delete(ctx.chat.id);
          await Storage.deleteState(ctx.chat.id);
        });
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Planner Error:", err);
      await ctx.reply(`❌ **Planning Failed!**\n\nError: ${err.message}`);
    }
  });
}
