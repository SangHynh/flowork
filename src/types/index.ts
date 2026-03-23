export interface Session {
  active: boolean;
  sessionId: string;
  workdir: string;
  startedAt: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  status:
    | 'pending'
    | 'done'
    | 'failed'
    | 'waiting_confirm'
    | 'approved'
    | 'rejected';
  type: 'progress' | 'error' | 'confirm' | 'file';
  sent: boolean;
  timestamp: string;
  reason?: string;
  file?: string;
}
