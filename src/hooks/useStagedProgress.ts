import { useCallback, useRef, useState } from 'react';

export interface UseStagedProgressConfig {
  fastDuration?: number; // seconds for stage 1
  fastTarget?: number; // percentage reached at end of stage 1
  slowSpan?: number; // percentage covered during stage 2
  slowSpeed?: number; // exponential decay factor
  maxWhileRunning?: number; // ceiling before completion (typically 90)
  intervalMs?: number;
}

export interface StagedProgressController {
  progress: number;
  start: () => void;
  complete: (durationMs?: number) => Promise<void>;
  reset: () => void;
}

export function computeStagedProgressValue(
  elapsedMs: number,
  config?: UseStagedProgressConfig
): number {
  const {
    fastDuration = 30,
    fastTarget = 50,
    slowSpan = 40,
    slowSpeed = 0.08,
    maxWhileRunning = 90,
  } = config || {};

  if (elapsedMs <= 0) return 0;
  const elapsedSeconds = elapsedMs / 1000;
  if (elapsedSeconds <= fastDuration) {
    const ratio = elapsedSeconds / fastDuration;
    return Math.min(fastTarget, ratio * fastTarget);
  }
  const slowElapsed = elapsedSeconds - fastDuration;
  const slowProgress = slowSpan * (1 - Math.exp(-slowSpeed * slowElapsed));
  return Math.min(maxWhileRunning, fastTarget + slowProgress);
}

export function useStagedProgress(config?: UseStagedProgressConfig): StagedProgressController {
  const {
    fastDuration = 30,
    fastTarget = 50,
    slowSpan = 40,
    slowSpeed = 0.08,
    maxWhileRunning = 90,
    intervalMs = 200,
  } = config || {};

  const [progress, setProgress] = useState(0);
  const latestProgressRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const computeRunningValue = useCallback(
    (elapsedMs: number) =>
      computeStagedProgressValue(elapsedMs, {
        fastDuration,
        fastTarget,
        slowSpan,
        slowSpeed,
        maxWhileRunning,
      }),
    [fastDuration, fastTarget, slowSpan, slowSpeed, maxWhileRunning]
  );

  const reset = useCallback(() => {
    clearTimers();
    startTimestampRef.current = null;
    latestProgressRef.current = 0;
    setProgress(0);
  }, [clearTimers]);

  const tick = useCallback(() => {
    if (!startTimestampRef.current) return;
    const elapsed = performance.now() - startTimestampRef.current;
    const nextValue = computeRunningValue(elapsed);
    if (nextValue > latestProgressRef.current) {
      latestProgressRef.current = nextValue;
      setProgress(nextValue);
    }
  }, [computeRunningValue]);

  const start = useCallback(() => {
    reset();
    startTimestampRef.current = performance.now();
    setProgress(0);
    timerRef.current = window.setInterval(() => {
      tick();
    }, intervalMs);
  }, [intervalMs, reset, tick]);

  const animateToTarget = useCallback(
    (target: number, durationMs: number, resolve: () => void) => {
      const startValue = latestProgressRef.current;
      const animationStart = performance.now();

      const step = () => {
        const elapsed = performance.now() - animationStart;
        const ratio = Math.min(1, elapsed / durationMs);
        const value = startValue + (target - startValue) * ratio;
        latestProgressRef.current = value;
        setProgress(value);
        if (ratio < 1) {
          animationRef.current = window.requestAnimationFrame(step);
        } else {
          animationRef.current = null;
          resolve();
        }
      };

      animationRef.current = window.requestAnimationFrame(step);
    },
    []
  );

  const complete = useCallback(
    (durationMs = 600) => {
      return new Promise<void>((resolve) => {
        clearTimers();
        animateToTarget(100, durationMs, resolve);
      });
    },
    [animateToTarget, clearTimers]
  );

  return {
    progress,
    start,
    complete,
    reset,
  };
}
