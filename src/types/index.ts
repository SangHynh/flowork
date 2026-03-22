export interface Article {
  title: string;
  link: string;
  description: string;
}

export interface Headline {
  title: string;
  link: string;
}

export interface Task {
  id: string;
  agent: "gemini-3-flash-preview" | "gemini-3.1-pro-preview";
  prompt: string;
  description: string;
  depends_on: string[];
  status: "pending" | "running" | "done" | "failed";
  output?: string;
  retries: number; // For Milestone 4.1 Auto-retry
  error?: string;
  critical?: boolean;
}

export interface Phase {
  id: number;
  tasks: Task[];
}

export interface DAG {
  phases: Phase[];
}

export interface WorkflowState {
  dag: DAG;
  currentPhaseIndex: number;
  status: "planning" | "running" | "paused" | "done" | "failed";
  chatId: number;
}
