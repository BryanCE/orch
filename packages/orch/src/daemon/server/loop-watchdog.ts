import { monitorEventLoopDelay } from "node:perf_hooks";
import type { Logger } from "../../types/core.ts";

export interface LoopWatchdog {
  stop(): void;
}

/** Sample the loop delay; once per `intervalMs`, log `loop.stalled` when the interval max exceeds `stallMs`, then reset the histogram. */
export function startLoopWatchdog(logger: Logger, stallMs: number, intervalMs: number): LoopWatchdog {
  // Histogram resolution is a sampling detail of this module, not a user setting.
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  let nextSampleAt = Date.now() + intervalMs;

  const sample = (): void => {
    const histogramMaxDelayMs = Math.round(histogram.max / 1e6);
    const timerDelayMs = Math.max(0, Date.now() - nextSampleAt);
    nextSampleAt += intervalMs;
    const maxDelayMs = Math.max(histogramMaxDelayMs, timerDelayMs);
    if (maxDelayMs >= stallMs) {
      logger.warn("loop.stalled", {
        maxDelayMs,
        meanDelayMs: Math.round(histogram.mean / 1e6),
        p99DelayMs: Math.round(histogram.percentile(99) / 1e6),
      });
    }
    histogram.reset();
  };

  const timer = setInterval(sample, intervalMs);
  timer.unref();

  return {
    stop(): void {
      clearInterval(timer);
      histogram.disable();
    },
  };
}
