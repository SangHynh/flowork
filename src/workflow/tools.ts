import fs from "fs/promises";
import path from "path";
import screenshot from "screenshot-desktop";
import { CONFIG } from "../config/index.js";

export class FactoryTools {
  /**
   * Ship all files from the factory to a dedicated project folder on user's desktop.
   * Returns the path to the created project folder.
   */
  static async shipAll(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const projectName = `Flowork_Shipment_${timestamp}`;
    const destinationRoot = path.join(CONFIG.WORKFLOW.DESKTOP_PATH, projectName);

    try {
      await fs.mkdir(destinationRoot, { recursive: true });
      const files = await fs.readdir(CONFIG.WORKFLOW.FACTORY_PATH);

      for (const file of files) {
        const source = path.join(CONFIG.WORKFLOW.FACTORY_PATH, file);
        const destination = path.join(destinationRoot, file);
        await fs.copyFile(source, destination);
      }
      return destinationRoot;
    } catch (error: unknown) {
      const err = error as Error;
      const shipErr = new Error(`Failed to ship all files to folder: ${err.message}`);
      shipErr.cause = err;
      throw shipErr;
    }
  }

  /**
   * Take a screenshot of the primary display and save it to the factory.
   * Returns the path to the screenshot file.
   */
  static async snapshot(): Promise<string> {
    const filename = `snapshot_${Date.now()}.jpg`;
    const filePath = path.join(CONFIG.WORKFLOW.FACTORY_PATH, filename);

    try {
      await screenshot({ filename: filePath });
      return filePath;
    } catch (error: unknown) {
      const err = error as Error;
      const snapErr = new Error(`Failed to take screenshot: ${err.message}`);
      snapErr.cause = err;
      throw snapErr;
    }
  }

  /**
   * Clean out the factory and material storage for a fresh start.
   */
  static async clean(): Promise<string> {
    try {
      const dirs = [CONFIG.WORKFLOW.FACTORY_PATH, CONFIG.WORKFLOW.MATERIAL_PATH];
      for (const dir of dirs) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          await fs.unlink(path.join(dir, file));
        }
      }
      return "🧹 Factory and Material warehouse are now spotless! ✨";
    } catch (error: unknown) {
      const err = error as Error;
      const cleanErr = new Error(`Cleaning failed: ${err.message}`);
      cleanErr.cause = err;
      throw cleanErr;
    }
  }
}
