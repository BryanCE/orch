import type { LifecycleVerb } from "./adapter.ts";
export interface CommandLock {
  pid: number;
  start_token: string;
  holder: string;
  note?: string;
  acquired_at: number;
}

/** Control effect requested for one live agent. */
export type ControlAction =
  | { readonly kind: "run"; readonly text: string; readonly id: string }
  | { readonly kind: "steer"; readonly text: string; readonly id: string }
  | { readonly kind: "answer"; readonly text: string; readonly id: string }
  | { readonly kind: "model"; readonly model: string; readonly id: string }
  | { readonly kind: "lifecycle"; readonly verb: LifecycleVerb };

/**
 * Route prompt text into a live agent through the mechanism its adapter declares.
 * New work and a mid-run steer travel the same way — a bridge link carries them
 * when the adapter takes that action. The keystroke path is the sole point where
 * a backend is touched when no bridge takes the action.
 */
/**
 * Whether the caller should wait for the agent to acknowledge this write.
 * `expected` means the text was pushed down the bridge link and the bridge will
 * ack it when it applies it; `none` means the channel has no reader that will ack.
 * The outbox needs this to tell a handoff apart from a delivery (L7).
 */
export type ControlAck = "expected" | "none";

export type ControlBoundaryOutcome =
  | { readonly outcome: "invoke"; readonly ack: ControlAck }
  | { readonly outcome: "answer"; readonly text: string; readonly reason: "not-placed" | "no-environment-role" | "not-asking" };
