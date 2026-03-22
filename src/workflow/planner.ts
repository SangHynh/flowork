import { Runner } from "./runner.js";
import { DAG } from "../types/index.js";
import { CONFIG } from "../config/index.js";

const PLANNER_SYSTEM_PROMPT = `
You are a Workflow Planner. Your job is to decompose a user request into a sequence of tasks (DAG).
Output ONLY a JSON object following this structure:
{
  "phases": [
    {
      "id": 1,
      "tasks": [
        {
          "id": "task-1",
          "agent": "gemini-3-flash-preview",
          "description": "Short description of the task",
          "prompt": "The precise prompt to send to the agent for this specific task",
          "depends_on": [],
          "critical": true
        }
      ]
    }
  ]
}

Rules:
1. Divide work into Phases. Tasks in the same Phase run in parallel. 
2. Tasks in Phase N+1 can depend on tasks in Phase N.
3. Use '${CONFIG.WORKFLOW.MODELS.DEFAULT}' for most tasks unless it requires heavy reasoning (use '${CONFIG.WORKFLOW.MODELS.PLANNER}').
4. ALWAYS use the directory '${CONFIG.WORKFLOW.FACTORY_PATH}' for any files you create, save, or scripts you generate. 
5. You can read input materials from '${CONFIG.WORKFLOW.MATERIAL_PATH}' if the user provides shared assets.
6. SHIP & SNAPSHOT: Inform the user that they can use the '/ship' command to move products to their Desktop/Telegram, and '/shot' to take a visual snapshot of the desktop.
7. Output NOTHING but the JSON. No markdown fences.
`;

export class Planner {
  static async generateDAG(userInput: string): Promise<DAG> {
    const fullPrompt = `${PLANNER_SYSTEM_PROMPT}\n\nUser Request: "${userInput}"`;

    // We use gemini-3.1-pro-preview for planning as it's the "Brain"
    const rawOutput = await Runner.run(fullPrompt, {
      // We don't want to resume context for planning typically
      // as it might pollute the DAG structure with previous task info
      resume: false,
    });

    return this.parseDAG(rawOutput);
  }

  private static parseDAG(raw: string): DAG {
    try {
      const jsonStr = this.extractJSON(raw);
      return JSON.parse(jsonStr);
    } catch (error: unknown) {
      console.error("Failed to parse DAG JSON:", raw);
      const err = error as Error;
      const parseErr = new Error(`Planner failed to generate a valid DAG: ${err.message}`);
      parseErr.cause = err;
      throw parseErr;
    }
  }

  private static extractJSON(raw: string): string {
    // Try to find markdown code block first
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return match[1].trim();

    // Fallback to finding the first { and last }
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) return raw.slice(start, end + 1);

    return raw.trim();
  }
}
