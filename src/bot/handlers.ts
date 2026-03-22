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
  console.log(`[Bot] Cập nhật Task ${task.id}: ${task.status}`);
  if (task.status === "running") {
    await ctx.reply(`⏳ Đang chạy: ${task.description}... (Thử lại: ${task.retries + 1}/${3})`);
  }
}

/**
 * Common notify logic for bot handlers when a phase completes.
 */
async function onPhaseComplete(ctx: Context, phaseId: number, tasks: Task[], totalPhases: number) {
  let phaseReport = `✅ **Giai đoạn ${phaseId} Hoàn tất!**\n\n`;
  tasks.forEach((t) => {
    phaseReport += `**${t.description}**:\n${t.output || "(Không có kết quả)"}\n\n`;
  });

  if (phaseId < totalPhases) {
    phaseReport +=
      "⏸ **Workflow Tạm dừng.** Sử dụng /continue để tiếp tục, hoặc /abort để dừng lại.";
  }

  await ctx.reply(phaseReport);
}

/**
 * Register all Telegram Bot handlers.
 */
export function registerHandlers(bot: Bot) {
  bot.command("help", async (ctx) => {
    const helpMsg = `🤖 **Flowork - Trợ lý Tự hành v1.1** 🇻🇳

**Các lệnh Cốt lõi:**
- \`/approve\` : Duyệt kế hoạch và bắt đầu chạy ngay.
- \`/continue\` : Tiếp tục sau khi tạm dừng.
- \`/abort\` : Dừng quy trình và xóa lịch sử hiện tại.
- \`/status\` : Kiểm tra tiến độ đang thực hiện.

**Công cụ Nhà máy (Factory Tools):**
- \`/ship\` : Đóng gói FILE ra Desktop & gửi vào Telegram.
- \`/shot\` : Chụp ảnh màn hình Desktop nhanh.
- \`/clean\` : Dọn dẹp sạch sẽ kho Factory & Material.

**Quản trị:**
- \`/killall\` : Dừng mọi quy trình đang chạy trên tất cả các Chat.

Chỉ cần gửi tin nhắn yêu cầu để bắt đầu! 🧠🚀`;
    await ctx.reply(helpMsg);
  });

  // --- Checkpoint: Restore sessions on startup ---
  Storage.init().then(async () => {
    const activeChats = await Storage.listActiveChats();
    console.log(`[Bot] Đang khôi phục ${activeChats.length} phiên làm việc cũ...`);

    for (const chatId of activeChats) {
      const state = await Storage.loadState(chatId);
      if (
        state &&
        (state.status === "running" || state.status === "paused" || state.status === "planning")
      ) {
        console.log(`[Bot] Đang khôi phục phiên cho Chat: ${chatId}`);

        const engine = new WorkflowEngine(
          state.dag,
          chatId,
          async (task: Task) => {
            if (task.status === "running") {
              await bot.api.sendMessage(
                chatId,
                `⏳ Đang chạy: ${task.description}... (Thử lại: ${task.retries})`,
              );
            }
          },
          async (phaseId: number) => {
            const report = `✅ Giai đoạn ${phaseId} Hoàn tất!\n\nSử dụng /continue hoặc /abort nhé sếp.`;
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
    if (!engine) return ctx.reply("💬 Hiện không có quy trình nào cần duyệt sếp ơi.");

    engine.resolveApproval();
    await ctx.reply("🚀 Kế hoạch đã được duyệt. Bắt đầu thực thi...");
  });

  bot.command("continue", async (ctx) => {
    const engine = activeEngines.get(ctx.chat.id);
    if (!engine || engine.getState().status !== "paused") {
      return ctx.reply("💬 Quy trình không ở trạng thái tạm dừng sếp ạ.");
    }

    engine.resolveApproval();
    await ctx.reply("⏭ Đang tiếp tục Giai đoạn tiếp theo...");
  });

  bot.command("abort", async (ctx) => {
    const engine = activeEngines.get(ctx.chat.id);
    if (!engine) return ctx.reply("💬 Hiện không có quy trình nào đang chạy để hủy.");

    engine.resolveAbort("Hủy bởi người dùng.");
    activeEngines.delete(ctx.chat.id);
    await Storage.deleteState(ctx.chat.id);
    await ctx.reply("🛑 Đã hủy Workflow và xóa lịch sử tạm.");
  });

  bot.command("killall", async (ctx) => {
    let count = 0;
    for (const [id, engine] of activeEngines.entries()) {
      engine.resolveAbort("Hệ thống yêu cầu dừng toàn bộ.");
      await Storage.deleteState(id);
      count++;
    }
    activeEngines.clear();
    await ctx.reply(`💀 Đã dừng cưỡng bức: ${count} quy trình đang chạy.`);
  });

  bot.command("status", async (ctx) => {
    const engine = activeEngines.get(ctx.chat.id);
    if (!engine) return ctx.reply("💬 Hiện không có quy trình nào đang thực hiện cả.");

    const state = engine.getState();
    await ctx.reply(
      `📊 **Tiến độ Hiện tại:**\n- Trạng thái: ${state.status}\n- Giai đoạn: ${state.currentPhaseIndex + 1}/${state.dag.phases.length}`,
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

      // Automated visual confirmation with a slight delay to allow OS to refresh icons
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const photoPath = await FactoryTools.snapshot();
      await ctx.replyWithPhoto(new InputFile(photoPath), {
        caption: `🖼️ Snapshot Desktop (Folder: ${folderName})`,
      });
    } catch (error: unknown) {
      const err = error as Error;
      await ctx.reply(`❌ Giao hàng hoặc chụp ảnh thất bại: ${err.message}`);
    }
  });

  bot.command("shot", async (ctx) => {
    try {
      const photoPath = await FactoryTools.snapshot();
      const { InputFile } = await import("grammy");
      await ctx.replyWithPhoto(new InputFile(photoPath), {
        caption: "📷 Ảnh chụp màn hình Desktop của sếp đây!",
      });
    } catch (error: unknown) {
      const err = error as Error;
      await ctx.reply(`❌ Chụp ảnh màn hình thất bại: ${err.message}`);
    }
  });

  bot.command("clean", async (ctx) => {
    try {
      const msg = await FactoryTools.clean();
      await ctx.reply(msg);
    } catch (error: unknown) {
      const err = error as Error;
      await ctx.reply(`❌ Dọn dẹp thất bại: ${err.message}`);
    }
  });

  bot.on("message:text", async (ctx) => {
    if (!ctx.chat) return; // Guard against undefined chat
    const userInput = ctx.message.text;
    if (userInput.startsWith("/")) return;

    if (activeEngines.has(ctx.chat.id)) {
      return ctx.reply("⚠️ Vui lòng đợi workflow hiện tại kết thúc hoặc dùng /abort để dừng.");
    }

    // Show "typing..." and send an immediate placeholder message for instant feedback
    await ctx.replyWithChatAction("typing");
    const thinkingMsg = await ctx.reply("🧠 **Đang động não...** / *Thinking...*");

    try {
      const { text, dag, executionTimeMs } = await Planner.generateDAG(userInput);
      const timeLabel = `\n\n⏱️ ${(executionTimeMs / 1000).toFixed(1)} giây`;

      // Edit the placeholder message with the actual response text + time
      await ctx.api.editMessageText(ctx.chat.id, thinkingMsg.message_id, text + timeLabel);

      if (dag) {
        // Prepare the engine for execution but DON'T execute until approved
        const engine = new WorkflowEngine(
          dag,
          ctx.chat.id,
          (task) => onTaskUpdate(ctx, task),
          (phaseId, tasks) => onPhaseComplete(ctx, phaseId, tasks, dag.phases.length),
        );

        activeEngines.set(ctx.chat.id, engine);
        await Storage.saveState(engine.getState());

        await ctx.reply(
          "📋 **Kế hoạch đã sẵn sàng!** Sếp xem qua thông tin ở trên rồi nhấn nút duyệt để bắt đầu nhé.",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "🚀 Duyệt và Bắt đầu", callback_data: "approve_plan" }]],
            },
          },
        );
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Planner Error:", err);
      await ctx.reply(`❌ **Không thể xử lý yêu cầu!**\n\nLỗi: ${err.message}`);
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    if (!ctx.chat) return;
    const chatId = ctx.chat.id;

    if (ctx.callbackQuery.data === "approve_plan") {
      const engine = activeEngines.get(chatId);
      if (!engine) return ctx.answerCallbackQuery("Không tìm thấy kế mẫu.");

      if (engine.getState().status === "planning") {
        engine.resolveApproval();
        await ctx.answerCallbackQuery("Bắt đầu workflow!");
        await ctx.editMessageText("🚀 Đã duyệt Kế hoạch! Đang thực thi...");

        engine
          .execute()
          .then(async () => {
            const state = engine.getState();
            if (state.status === "done") {
              await ctx.reply(
                "🏁 **Công việc đã hoàn thành mỹ mãn!** Sếp dùng /ship để nhận hàng nhé.",
              );
              activeEngines.delete(chatId);
              await Storage.deleteState(chatId);
            }
          })
          .catch(async (err: unknown) => {
            const error = err as Error;
            console.error("Execution Error:", error);
            await ctx.reply(`❌ **Workflow Thất bại!**\n\nLỗi: ${error.message}`);
            activeEngines.delete(chatId);
            await Storage.deleteState(chatId);
          });
      } else {
        await ctx.answerCallbackQuery("Workflow đã được bắt đầu trước đó.");
      }
    }
  });
}
