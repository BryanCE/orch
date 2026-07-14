/** Agent CLIs supported by orch. */
export type AdapterId = "pi" | "claude" | "codex";

/** Ways an adapter can deliver a mid-run steering message. */
export type SteerMechanism = "inbox" | "keys" | "resume" | "none";

/** States an adapter may expose through orch's presence protocol. */
export type AgentState = "idle" | "working" | "blocked" | "done" | "error" | "aborted" | "exited" | "unknown";

/** Inputs shared by interactive and detached spawn commands. */
export interface SpawnOpts {
  /** Presence key to associate with the spawned session, when already allocated. */
  readonly key?: string;
  /** Working directory in which the agent CLI must start. */
  readonly cwd?: string;
  /** Model specification selected for the session, when supported. */
  readonly model?: string;
  /** Directory containing orch's presence protocol files. */
  readonly orchDir?: string;
  /** Additional environment values required by the adapter process. */
  readonly env?: Readonly<Record<string, string>>;
}

/** Native process/session information an adapter may use to classify state. */
export interface StateDetectionInput {
  /** Latest adapter-native output, if state is reported in a stream or log. */
  readonly output?: string;
  /** Exit status when the process has terminated. */
  readonly exitCode?: number;
  /** Termination signal, when the process was signalled. */
  readonly signal?: string;
}

/** Request passed to an adapter's steering mechanism. */
export interface SteerRequest {
  /** Target presence key or adapter-native session identifier. */
  readonly key: string;
  /** Text to deliver to the running agent. */
  readonly text: string;
  /** Session options needed by resume- or keys-based delivery. */
  readonly opts?: SpawnOpts;
}

/** Request passed to an adapter when answering a blocking question. */
export interface AnswerRequest {
  /** Target presence key or adapter-native session identifier. */
  readonly key: string;
  /** Answer text to deliver to the agent. */
  readonly text: string;
  /** Session options needed by the adapter's answer mechanism. */
  readonly opts?: SpawnOpts;
}

/** A command a backend can execute on an adapter's behalf. */
export interface AdapterCommand {
  /** Executable and arguments, without shell quoting. */
  readonly argv: readonly string[];
  /** Optional text to write to the command's standard input. */
  readonly stdin?: string;
}

/** Native output supplied to an adapter for final-result extraction. */
export interface ResultExtractionInput {
  /** Complete adapter-native output, when available. */
  readonly output?: string;
  /** Path to a native session transcript, when the adapter exposes one. */
  readonly sessionPath?: string;
}

/**
 * Contract implemented by each agent CLI adapter.
 *
 * Adapters translate agent-native behavior into orch's presence protocol;
 * core commands must continue to consume presence data rather than native formats.
 */
export interface AgentAdapter {
  /** Stable adapter id recorded in the spawn registry and presence status. */
  readonly id: AdapterId;
  /**
   * Declared behavior limits used by commands to choose safe fallbacks or fail clearly.
   */
  readonly caps: {
    /** Steering mechanism: inbox is lossless, keys/resume are degraded, none is unsupported. */
    readonly steer: SteerMechanism;
    /** Whether the adapter can participate in orch's blocking question/answer flow. */
    readonly ask: boolean;
    /** Whether `orch model` can change this adapter's active model. */
    readonly setModel: boolean;
    /** Whether native session output can be tailed for supplementary state/result data. */
    readonly sessionTail: boolean;
  };
  /** Build the normal shell command used to start one agent in an interactive pane. */
  interactiveCmd(opts: SpawnOpts): string;
  /**
   * Build the restricted shell command used for worker launches.
   * Adapters that cannot enforce a tool allowlist return their normal command;
   * this is an explicit capability gap rather than an implicit global discovery.
   * Omit this method when the adapter cannot restrict launches.
   */
  restrictedInteractiveCmd?(opts: SpawnOpts): string;
  /** Build argv for a detached backend, including the initial prompt. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[];
  /**
   * Build restricted argv for a detached worker, including the initial prompt.
   * Adapters without allowlist support may omit this method or return headlessCmd(prompt, opts).
   */
  restrictedHeadlessCmd?(prompt: string, opts: SpawnOpts): string[];
  /** Translate native process/session signals into a presence-protocol state. */
  detectState(input: StateDetectionInput): AgentState;
  /** Build the command or presence action used to deliver a steering message. */
  steer(request: SteerRequest): AdapterCommand | undefined;
  /** Build the command or presence action used to answer a blocking question. */
  answer(request: AnswerRequest): AdapterCommand | undefined;
  /** Extract the final assistant text that should be written to `result.json`. */
  extractResult(input: ResultExtractionInput): string | undefined;
  /** Install adapter-specific hooks/shims without removing unrelated user setup. */
  installShim?(): void | Promise<void>;
}
