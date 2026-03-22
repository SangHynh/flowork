import pLimit from "p-limit";
import { Runner } from "./runner.js";
import { DAG, Task, WorkflowState } from "../types/index.js";
import { CONFIG } from "../config/index.js";
import { Storage } from "./storage.js";

export class WorkflowEngine {
  private limit: ReturnType<typeof pLimit>;
  private state: WorkflowState;
  private onTaskUpdate: (task: Task) => Promise<void>;
  private onPhaseComplete: (phaseId: number, tasks: Task[]) => Promise<void>;

  // Checkpoint Resolvers
  private approvalResolver: (() => void) | null = null;
  private abortResolver: ((reason: Error) => void) | null = null;

  constructor(
    dag: DAG,
    chatId: number,
    onTaskUpdate: (task: Task) => Promise<void>,
    onPhaseComplete: (phaseId: number, tasks: Task[]) => Promise<void>,
    initialState?: WorkflowState,
  ) {
    this.limit = pLimit(CONFIG.WORKFLOW.CONCURRENCY.MAX_TASKS);
    this.onTaskUpdate = onTaskUpdate;
    this.onPhaseComplete = onPhaseComplete;
    this.state = initialState || {
      dag,
      currentPhaseIndex: 0,
      status: "planning",
      chatId,
    };
  }

  private waitForApproval(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.approvalResolver = resolve;
      this.abortResolver = reject;
    });
  }

  resolveApproval() {
    if (this.approvalResolver) {
      this.approvalResolver();
      this.approvalResolver = null;
      this.abortResolver = null;
    }
  }

  resolveAbort(reason: string = "Aborted by user") {
    if (this.abortResolver) {
      this.abortResolver(new Error(reason));
      this.approvalResolver = null;
      this.abortResolver = null;
    }
  }

  async execute() {
    console.log(
      `[Engine] Đang thực thi workflow cho Chat: ${this.state.chatId}. Trạng thái hiện tại: ${this.state.status}`,
    );

    // Persist status change
    await Storage.saveState(this.state);

    // Checkpoint 1: Initial Plan Approval (only if we are starting fresh)
    if (this.state.status === "planning") {
      await this.waitForApproval();
    }

    this.state.status = "running";
    await Storage.saveState(this.state);

    for (let i = this.state.currentPhaseIndex; i < this.state.dag.phases.length; i++) {
      this.state.currentPhaseIndex = i;
      const phase = this.state.dag.phases[i];
      console.log(
        `[Engine] Chat ${this.state.chatId} | Executing Phase ${phase.id} (${phase.tasks.length} tasks)`,
      );

      const taskPromises = phase.tasks
        .filter((t) => t.status !== "done") // Skip completed tasks if we resumed
        .map((task) =>
          this.limit(async () => {
            let attempt = task.retries;
            const maxRetries = CONFIG.WORKFLOW.RETRIES.MAX;

            while (attempt <= maxRetries) {
              task.status = "running";
              task.retries = attempt;
              await this.onTaskUpdate(task);
              await Storage.saveState(this.state);

              try {
                const result = await Runner.run(task.prompt);
                task.output = result;
                task.status = "done";
                task.error = undefined;
                await this.onTaskUpdate(task);
                await Storage.saveState(this.state);
                return; // Goal reached for this task
              } catch (error: unknown) {
                const err = error as Error;
                console.error(
                  `[Engine] Task ${task.id} failed (Attempt ${attempt + 1}/${maxRetries + 1}):`,
                  err.message,
                );
                task.error = err.message;

                if (attempt < maxRetries) {
                  attempt++;
                  console.log(`[Engine] Retrying task ${task.id}...`);
                } else {
                  task.status = "failed";
                  await this.onTaskUpdate(task);
                  await Storage.saveState(this.state);
                  if (task.critical) {
                    const criticalErr = new Error(
                      `Critical task ${task.id} failed after ${maxRetries + 1} attempts.`,
                    );
                    criticalErr.cause = err;
                    throw criticalErr;
                  }
                  return; // Non-critical failed, continue phase
                }
              }
            }
          }),
        );

      await Promise.all(taskPromises);
      console.log(`[Engine] Phase ${phase.id} complete.`);

      // Notify phase completion
      await this.onPhaseComplete(phase.id, phase.tasks);

      // Checkpoint 2: Phase Continuation (except for the last phase)
      if (i < this.state.dag.phases.length - 1) {
        this.state.status = "paused";
        await Storage.saveState(this.state);
        console.log(`[Engine] Paused for Chat ${this.state.chatId}. Waiting for /continue.`);
        await this.waitForApproval();
        this.state.status = "running";
        await Storage.saveState(this.state);
      }
    }

    this.state.status = "done";
    await Storage.saveState(this.state);
    console.log(`[Engine] Workflow complete for Chat: ${this.state.chatId}`);
  }

  getState() {
    return this.state;
  }
}
