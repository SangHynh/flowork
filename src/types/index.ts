export interface Session {
  workdir: string;
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
