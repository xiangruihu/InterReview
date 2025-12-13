import type { UseStagedProgressConfig } from '../hooks/useStagedProgress';

export const DEFAULT_UPLOAD_PROGRESS_CONFIG: UseStagedProgressConfig = {
  fastDuration: 30,
  fastTarget: 50,
  slowSpan: 40,
  slowSpeed: 0.08,
  maxWhileRunning: 90,
  intervalMs: 200,
};

export const DEFAULT_UPLOAD_COMPLETION_DURATION = 700;

export const DEFAULT_ANALYSIS_PROGRESS_CONFIG: UseStagedProgressConfig = {
  fastDuration: 30,
  fastTarget: 50,
  slowSpan: 40,
  slowSpeed: 0.08,
  maxWhileRunning: 90,
  intervalMs: 200,
};

export const DEFAULT_ANALYSIS_COMPLETION_DURATION = 700;
