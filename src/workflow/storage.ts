import fs from "fs/promises";
import path from "path";
import { WorkflowState } from "../types/index.js";
import { CONFIG } from "../config/index.js";

export class Storage {
  private static getFilePath(chatId: number): string {
    return path.join(CONFIG.WORKFLOW.STORAGE_PATH, `${chatId}.json`);
  }

  static async init() {
    try {
      await fs.mkdir(CONFIG.WORKFLOW.STORAGE_PATH, { recursive: true });
    } catch (err) {
      console.error("Failed to initialize storage directory:", err);
    }
  }

  static async saveState(state: WorkflowState) {
    try {
      const filePath = this.getFilePath(state.chatId);
      await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
      // console.log(`[Storage] Saved state for chat ${state.chatId}`);
    } catch (err) {
      console.error(`[Storage] Failed to save state for chat ${state.chatId}:`, err);
    }
  }

  static async loadState(chatId: number): Promise<WorkflowState | null> {
    try {
      const filePath = this.getFilePath(chatId);
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return null; // File doesn't exist or is invalid
    }
  }

  static async deleteState(chatId: number) {
    try {
      const filePath = this.getFilePath(chatId);
      await fs.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  static async listActiveChats(): Promise<number[]> {
    try {
      const files = await fs.readdir(CONFIG.WORKFLOW.STORAGE_PATH);
      return files.filter((f) => f.endsWith(".json")).map((f) => parseInt(f.replace(".json", "")));
    } catch {
      return [];
    }
  }
}
