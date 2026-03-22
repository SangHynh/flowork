import fs from "fs/promises";
import path from "path";
import { Headline } from "../types";

export class Reporter {
  /**
   * Saves a list of news headlines to a .txt file with clear formatting.
   * @param news List of Headline objects.
   * @param fileName Optional filename, defaults to news-report.txt.
   */
  static async saveNewsToFile(
    news: Headline[],
    fileName: string = "news-report.txt",
  ): Promise<string> {
    if (!news || news.length === 0) {
      return "No news to save.";
    }

    const timestamp = new Date().toLocaleString();
    let content = `NEWS REPORT - ${timestamp}\n`;
    content += "=".repeat(40) + "\n\n";

    news.forEach((item, index) => {
      content += `${index + 1}. ${item.title}\n`;
      content += `   Link: ${item.link}\n`;
      content += "-".repeat(20) + "\n";
    });

    content += `\nTotal items: ${news.length}\n`;

    const filePath = path.join(process.cwd(), fileName);

    try {
      await fs.writeFile(filePath, content, "utf8");
      return filePath;
    } catch (error) {
      console.error("Error saving news to file:", error);
      throw error;
    }
  }
}
