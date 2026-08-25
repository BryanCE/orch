// herdr pane-state decision machine: folds agent lifecycle events (session
// start, agent start/end, herdr's blocked signal) into a single working/blocked/
// idle state, with an idle debounce and a retry-grace hold that keeps a retrying
// agent shown as `working` until it settles to `blocked`. Pure timing/decision
// logic — it hands each resolved state to the injected sink and never dials a
// socket itself.
import type { AgentState } from "./pane-socket.ts";

export interface PaneStateMachineConfig {
  idleDebounceMs: number;
  retryGraceMs: number;
  /** Where a resolved state (deduped) is handed for delivery. */
  enqueueState: (state: AgentState, message?: string) => void;
}

export interface PaneStateMachine {
  /** Session (re)start: adopt the observed activity and force a fresh publish. */
  openSession(active: boolean): void;
  /** An agent turn began — clear any pending failure hold and go working. */
  startRun(): void;
  /** An agent turn ended; hold working on a retryable error, else debounce idle. */
  endRun(retryableMessage: string | undefined): void;
  /** herdr's out-of-band blocked signal toggled for this pane. */
  setBlocked(active: boolean, label: string | undefined): void;
  /** Cancel any pending idle/retry timers (session teardown). */
  clearTimers(): void;
}

export function createPaneStateMachine(config: PaneStateMachineConfig): PaneStateMachine {
  const { idleDebounceMs, retryGraceMs, enqueueState } = config;

  let agentActive = false;
  let retryHoldActive = false;
  let failureBlocked = false;
  let failureMessage: string | undefined;
  let blockedCount = 0;
  let blockedMessage: string | undefined;
  let lastState: AgentState | undefined;
  let lastMessage: string | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function clearPendingTimers(): void {
    if (idleTimer) clearTimeout(idleTimer);
    if (retryTimer) clearTimeout(retryTimer);
    idleTimer = undefined;
    retryTimer = undefined;
  }

  function clearFailureState(): void {
    retryHoldActive = false;
    failureBlocked = false;
    failureMessage = undefined;
  }

  function desiredState(): { state: AgentState; message?: string } {
    if (blockedCount > 0) return { state: "blocked", message: blockedMessage };
    if (failureBlocked) return { state: "blocked", message: failureMessage };
    if (agentActive || retryHoldActive) return { state: "working" };
    return { state: "idle" };
  }

  function publishState(force = false): void {
    const next = desiredState();
    if (!force && next.state === lastState && next.message === lastMessage) return;
    lastState = next.state;
    lastMessage = next.message;
    enqueueState(next.state, next.message);
  }

  function scheduleIdle(): void {
    clearPendingTimers();
    clearFailureState();
    idleTimer = setTimeout(() => {
      idleTimer = undefined;
      publishState();
    }, idleDebounceMs);
    idleTimer.unref?.();
  }

  function holdForRetry(message: string): void {
    clearPendingTimers();
    retryHoldActive = true;
    failureBlocked = false;
    failureMessage = message;
    publishState();
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      retryHoldActive = false;
      failureBlocked = true;
      publishState();
    }, retryGraceMs);
    retryTimer.unref?.();
  }

  return {
    openSession(active: boolean): void {
      agentActive = active;
      publishState(true);
    },
    startRun(): void {
      clearPendingTimers();
      clearFailureState();
      agentActive = true;
      publishState();
    },
    endRun(retryableMessage: string | undefined): void {
      // Pi can emit duplicate/late end events while auto-retry is already holding
      // the pane in Working; an unqualified duplicate end must not publish Idle.
      if (!agentActive) return;
      agentActive = false;
      if (retryableMessage) {
        holdForRetry(retryableMessage);
        return;
      }
      scheduleIdle();
    },
    setBlocked(active: boolean, label: string | undefined): void {
      if (!active) {
        blockedCount = Math.max(0, blockedCount - 1);
        if (blockedCount === 0) blockedMessage = undefined;
        publishState();
        return;
      }
      clearPendingTimers();
      blockedCount += 1;
      blockedMessage = label;
      publishState();
    },
    clearTimers(): void {
      clearPendingTimers();
    },
  };
}
