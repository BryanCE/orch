/** Milliseconds spent in each named phase of one handler, so a trace line names what blocked orchd. */
export interface PhaseClock {
  /** Close the phase running since the last lap, under this name. */
  lap(phase: string): void;
  phases(): Record<string, number>;
}

export function phaseClock(now: () => number = () => performance.now()): PhaseClock {
  const spent: Record<string, number> = {};
  let last = now();
  return {
    lap(phase) {
      const at = now();
      spent[phase] = Math.round(at - last);
      last = at;
    },
    phases: () => ({ ...spent }),
  };
}
