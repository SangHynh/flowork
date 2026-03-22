import spawn from "cross-spawn";
import { CONFIG } from "../config/index.js";

export class Runner {
  static async run(prompt: string, options: { resume?: boolean } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(
          new Error(
            `CLI Execution timed out after ${CONFIG.WORKFLOW.TIMEOUTS.RUNNER_MS / 1000} seconds.`,
          ),
        );
      }, CONFIG.WORKFLOW.TIMEOUTS.RUNNER_MS);

      const args = ["-y", "-m", CONFIG.WORKFLOW.MODELS.DEFAULT, "--output-format", "text"];

      if (options.resume) {
        args.push("-r", "latest");
      }

      console.log(`[Runner] Executing: gemini ${args.join(" ")} (Prompt via STDIN)`);

      const child = spawn("gemini", args, {
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      if (child.stdin) {
        // Prepend strict instruction to ensure all agents stay in the factory
        const sandboxInstruction = `[SYSTEM INSTRUCTION: ALWAYS use the directory '${CONFIG.WORKFLOW.FACTORY_PATH}' for any file-related operations, saving, or code generation. DO NOT write to the root or 'src/'. Read input materials from '${CONFIG.WORKFLOW.MATERIAL_PATH}' if needed.]\n\n`;
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
        reject(new Error(`Failed to start child process: ${err.message}`));
      });
    });
  }
}
