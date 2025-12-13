import type { StagedTaskState } from '../types/uploads';
import type { UseStagedProgressConfig } from '../hooks/useStagedProgress';
import { computeStagedProgressValue } from '../hooks/useStagedProgress';

interface TaskProgressOptions {
  config?: UseStagedProgressConfig;
  completionDuration?: number;
  now?: number;
}

export function computeTaskProgress(
  task?: StagedTaskState,
  options?: TaskProgressOptions
): number {
  if (!task || !task.startedAt) return 0;
  const { config, completionDuration = 600, now = Date.now() } = options || {};
  const effectiveConfig: UseStagedProgressConfig = {
    fastDuration: 30,
    fastTarget: 50,
    slowSpan: 40,
    slowSpeed: 0.08,
    maxWhileRunning: 90,
    ...config,
  };

  if (task.status === 'running') {
    return computeStagedProgressValue(now - task.startedAt, effectiveConfig);
  }

  if (task.status === 'success') {
    if (!task.completedAt) return 100;
    const baseProgress = Math.min(
      task.progressAtCompletion ??
        computeStagedProgressValue(task.completedAt - task.startedAt, effectiveConfig),
      effectiveConfig.maxWhileRunning ?? 90
    );
    const elapsedSinceComplete = now - task.completedAt;
    if (elapsedSinceComplete >= completionDuration) {
      return 100;
    }
    return baseProgress + (100 - baseProgress) * (elapsedSinceComplete / completionDuration);
  }

  if (task.status === 'error') {
    return task.progressAtCompletion ?? 0;
  }

  return 0;
}

export function shouldAnimateTaskProgress(
  task?: StagedTaskState,
  options?: TaskProgressOptions
): boolean {
  if (!task) return false;
  const { completionDuration = 600, now = Date.now() } = options || {};
  if (task.status === 'running') return true;
  if (task.status === 'success' && task.completedAt) {
    const elapsed = now - task.completedAt;
    return elapsed < completionDuration && (task.progressAtCompletion ?? 0) < 100;
  }
  return false;
}
