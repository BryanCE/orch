/** A broadcast wake: every waiter parked on `next()` resumes on one `wake()`. */
export interface WakeSignal {
  wake(): void;
  /** Resolves on the next wake, on abort, or after `timeoutMs`, whichever comes first. */
  next(timeoutMs: number, signal?: AbortSignal): Promise<void>;
}

interface PendingWake {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
}

function pendingWake(): PendingWake {
  let resolvePending: () => void = () => { /* assigned before the promise can settle */ };
  const promise = new Promise<void>((resolve) => {
    resolvePending = resolve;
  });
  return { promise, resolve: resolvePending };
}

export function createWakeSignal(): WakeSignal {
  let pending = pendingWake();
  return {
    wake(): void {
      pending.resolve();
      pending = pendingWake();
    },
    next(timeoutMs: number, signal?: AbortSignal): Promise<void> {
      if (signal?.aborted) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let settled = false;
        const timer = setTimeout(done, timeoutMs);
        const onAbort = (): void => done();
        const cleanup = (): void => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
        };
        function done(): void {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        }
        signal?.addEventListener("abort", onAbort, { once: true });
        void pending.promise.then(done);
      });
    },
  };
}
