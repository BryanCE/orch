export interface CommandLock {
  pid: number;
  start_token: string;
  holder: string;
  note?: string;
  acquired_at: number;
}

/** Control effect requested for one live agent. */
export type ControlAction =
  | { readonly kind: "run"; readonly text: string; readonly id?: string }
  | { readonly kind: "steer"; readonly text: string; readonly id?: string }
  | { readonly kind: "answer"; readonly text: string }
  | { readonly kind: "model"; readonly model: string; readonly id: string }
  | { readonly kind: "lifecycle"; readonly verb: LifecycleVerb };

/**
 * Route prompt text into a live agent through the mechanism its ADAPTER declares.
 * New work and a mid-run steer travel the same way — an agent has exactly one text
 * channel, and which one it is belongs to the adapter, never to the backend it
 * happens to be running in. The keystroke path is the sole point where a backend
 * is touched, and only an adapter declaring `steer: "keys"` ever reaches it.
 */
/**
 * Whether the caller should wait for the agent to acknowledge this write.
 * `expected` means the text went into the agent's inbox and its bridge will
 * append the marker once it actually reads it; `none` means the channel has no
 * reader that will ever ack — a pane keystroke, or a local adapter command.
 * The outbox needs this to tell a handoff apart from a delivery (L7).
 */
export type ControlAck = "expected" | "none";

export type ControlBoundaryOutcome =
  | { readonly outcome: "invoke"; readonly ack: ControlAck }
  | { readonly outcome: "answer"; readonly text: string; readonly reason: "no-pane" | "no-environment-role" };
