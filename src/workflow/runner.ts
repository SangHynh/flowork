import spawn from "cross-spawn";
import { CONFIG } from "../config/index.js";

export class Runner {
  static async run(prompt: string, options: { resume?: boolean } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(
          new Error(
            `Quá thời gian thực thi (Timeout) sau ${CONFIG.WORKFLOW.TIMEOUTS.RUNNER_MS / 1000} giây.`,
          ),
        );
      }, CONFIG.WORKFLOW.TIMEOUTS.RUNNER_MS);

      const args = ["-y", "-m", CONFIG.WORKFLOW.MODELS.DEFAULT, "--output-format", "text"];

      if (options.resume) {
        args.push("-r", "latest");
      }

      console.log(`[Runner] Đang thực thi: gemini ${args.join(" ")} (Prompt qua STDIN)`);

      const child = spawn("gemini", args, {
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (child.stdin) {
        // Prepend strict instruction to ensure all agents stay in the factory
        const sandboxInstruction = `[HƯỚNG DẪN HỆ THỐNG: LUÔN sử dụng thư mục '${CONFIG.WORKFLOW.FACTORY_PATH}' cho mọi thao tác liên quan đến file, lưu trữ hoặc tạo code. KHÔNG ghi vào thư mục gốc hoặc 'src/'. Đọc tài liệu đầu vào từ '${CONFIG.WORKFLOW.MATERIAL_PATH}' nếu cần.]\n\n`;
        child.stdin.write(sandboxInstruction + prompt + "\n");
        child.stdin.end();
      }

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        const msg = data.toString();
        // Filter out benign logs
        if (!msg.includes("Loaded cached credentials")) {
          stderr += msg;
        }
      });

      child.on("close", (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          const fullError = `Exit Code: ${code}\nSTDERR: ${stderr}\nSTDOUT: ${stdout}`;
          reject(new Error(fullError));
        } else {
          resolve(stdout.trim());
        }
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Không thể khởi động tiến trình: ${err.message}`));
      });
    });
  }
}
