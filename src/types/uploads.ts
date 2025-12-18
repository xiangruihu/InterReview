export type StagedTaskStatus = 'idle' | 'running' | 'success' | 'error';

export interface StagedTaskState {
  status: StagedTaskStatus;
  startedAt?: number;
  completedAt?: number;
  progressAtCompletion?: number;
  completionDuration?: number;
  label?: string;
  error?: string;
}

export type UploadTaskState = StagedTaskState;
export type AnalysisTaskState = StagedTaskState;

export interface TaskProgressState {
  percent: number;
  stage: 'uploading' | 'transcribing' | 'analyzing';
  message?: string;
  updatedAt: number;
}
