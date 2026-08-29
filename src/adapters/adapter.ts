import type { CheckResult } from "../check-result.ts";
import type { WorkerPolicy } from "../policy/workers.ts";
import type { ThinkingLevel } from "../policy/thinking.ts";

/** The closed adapter-id set, importable without pulling any provider code. */
export const ADAPTER_IDS = ["pi", "omp", "claude", "codex"] as const;

/** Agent CLIs supported by orch. */
export type AdapterId = (typeof ADAPTER_IDS)[number];

export function isAdapterId(value: unknown): value is AdapterId {
  return typeof value === "string" && ADAPTER_IDS.some((id) => id === value);
}

/** Ways an adapter can deliver a mid-run steering message. */
export type SteerMechanism = "inbox" | "keys" | "resume" | "none";

/** Session-lifecycle verbs an adapter may declare a native mechanism for. */
const LIFECYCLE_VERBS = ["reset", "reload", "restart"] as const;

export type LifecycleVerb = (typeof LIFECYCLE_VERBS)[number];

export function isLifecycleVerb(value: unknown): value is LifecycleVerb {
  return typeof value === "string" && LIFECYCLE_VERBS.some((verb) => verb === value);
}

/** States an adapter may expose through orch's presence protocol. */
export const AGENT_STATES = ["idle", "working", "blocked", "asking", "done", "error", "aborted", "exited", "unknown"] as const;
export type AgentState = (typeof AGENT_STATES)[number];

/** Inputs shared by interactive and detached spawn commands. */
export interface SpawnOpts {
  /** Presence key to associate with the spawned session, when already allocated. */
  readonly key?: string;
  /** Working directory in which the agent CLI must start. */
  readonly cwd?: string;
  /** Model specification selected for the session, when supported. */
  readonly model?: string;
  /** Independent thinking effort selected for the session, when supported. */
  readonly thinking?: ThinkingLevel;
  /** Model patterns the harness should expose in its native cycle/picker, when configured. */
  readonly preferredModels?: readonly string[];
  /** Directory containing orch's presence protocol files. */
  readonly orchDir?: string;
  /** Additional environment values required by the adapter process. */
  readonly env?: Readonly<Record<string, string>>;
  /** Explicit worker tool allowlist, when the launcher applies one. */
  readonly tools?: string;
  /** What this worker may load; the adapter maps it onto its harness's flags. */
  readonly workers?: WorkerPolicy;
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
  /** Outbox id used to acknowledge lossless inbox delivery. */
  readonly id?: string;
  /** Session options needed by resume- or keys-based delivery. */
  readonly opts?: SpawnOpts;
}

/** Request passed to an adapter when switching a live session's model. */
export interface ModelRequest {
  /** Target presence key or adapter-native session identifier. */
  readonly key: string;
  /** Model specification to switch the running session to. */
  readonly model: string;
  /** Dispatcher request id the agent must echo into its control outcome. */
  readonly id: string;
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

/** Options for adapter shim installation during setup. */
export interface ShimInstallOpts {
  /** Copy shim artifacts instead of symlinking them. */
  readonly copy?: boolean;
}

/** Native output supplied to an adapter for final-result extraction. */
export interface ResultExtractionInput {
  /** Complete adapter-native output, when available. */
  readonly output?: string;
  /** Path to a native session transcript, when the adapter exposes one. */
  readonly sessionPath?: string;
}

/** A tool invocation summarized for a session-view assistant turn. */
export interface SessionViewToolCall {
  /** Tool name, or "tool" when the adapter cannot name it. */
  readonly name: string;
  /** The most descriptive argument value the adapter recovered, unformatted (commands own truncation/collapsing). */
  readonly arg: string;
}

/**
 * One content-bearing turn in a session view, normalized across harnesses so
 * `orch tail`/`orch session` can render per-turn rows without importing any
 * per-harness session parser. Adapters emit only renderable turns; commands own
 * all layout (columns, role labels, timestamps, truncation, collapsing).
 */
export interface SessionViewEntry {
  /** Turn role, normalized to orch's three tail rows. */
  readonly role: "user" | "assistant" | "tool";
  /** Flattened turn text, when the turn carries any. */
  readonly text?: string;
  /** Tool calls for an assistant turn that only invoked tools; omitted otherwise. */
  readonly toolCalls?: readonly SessionViewToolCall[];
  /** Tool name for a tool-result turn. */
  readonly tool?: string;
  /** Whether a tool-result turn reported an error. */
  readonly isError?: boolean;
  /** ISO timestamp of the turn, when the session records one. */
  readonly timestamp?: string;
}

/** Supplementary display data an adapter can recover from its native session output. */
export interface SessionView {
  /** Presence-protocol state inferred from session content, when the adapter derives one. */
  readonly state?: AgentState;
  /** Active model identifier, when the session records one. */
  readonly model?: string;
  /** Model provider, when the session records one. */
  readonly provider?: string;
  /** Active thinking/reasoning level, when the session records one. */
  readonly thinking?: string;
  /** Most recent user task/prompt text, when the session records one. */
  readonly task?: string;
  /** Most recent assistant text, when the session records one. */
  readonly lastText?: string;
  /** Accumulated cost, when the session records one. */
  readonly cost?: number;
  /** Token usage totals, when the session records them. */
  readonly tokens?: unknown;
  /** Completed turn count, when the session records one. */
  readonly turns?: number;
  /**
   * Per-turn items for rich tailing, populated by adapters whose parser can
   * produce them. Commands render the header+last-text fallback when omitted;
   * an empty array means the session was read but had no content-bearing turns.
   */
  readonly entries?: readonly SessionViewEntry[];
}

/** Input to an adapter's session-tail read. */
export interface SessionViewInput {
  /** Path to the adapter-native session/transcript file, when one exists on disk. */
  readonly sessionPath?: string;
  /** Native process output captured in memory, when no on-disk session path applies. */
  readonly output?: string;
}

/**
 * Contract implemented by each agent CLI adapter.
 *
 * Adapters translate agent-native behavior into orch's presence protocol;
 * core commands must continue to consume presence data rather than native formats.
 */
/** One model a harness can run, reported in orch's vocabulary rather than the harness's. */
export interface HarnessModel {
  /** orch's `provider/id` spec — exactly the token `--model` accepts. */
  readonly spec: string;
  /** The harness's own display name for it, when it has one. */
  readonly label?: string;
}

export interface ThinkingStrategy {
  /** Translate orch's neutral level into this harness's launch vocabulary. */
  launchArgs(level: ThinkingLevel): readonly string[];
  /** Apply a level to a running session where the harness supports it. */
  set(level: ThinkingLevel): void;
}

export interface WorkerLaunchRole {
  restrictedInteractiveCmd(opts: SpawnOpts): string;
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[];
}

export interface ModelControlRole {
  setModel(request: ModelRequest): AdapterCommand | undefined;
}

export interface LifecycleControlRole {
  lifecycleCmd(verb: LifecycleVerb): { text: string } | undefined;
}

export interface SessionViewRole {
  readSessionView(input: SessionViewInput): SessionView | undefined;
}

export interface WorkspaceTrustRole {
  preTrustWorkspace(cwd: string, cmd: string): void;
}

export interface ShimRole {
  installShim(opts?: ShimInstallOpts): void | Promise<void>;
  diagnoseShim(): CheckResult | Promise<CheckResult>;
}

export interface DefaultModelRole {
  defaultModelString(): string | undefined;
}

export interface ModelCatalogueRole {
  listModels(): readonly HarnessModel[];
}

export interface ModelWarmRole {
  warmModels(): Promise<void>;
}

export interface QuestionRole {
  answer(request: AnswerRequest): AdapterCommand | undefined;
}

export interface InboxSteeringRole {
  steer(request: SteerRequest): AdapterCommand | undefined;
}

export interface PresenceRegistrationRole {
  isRegistered(key: string): boolean;
}

export interface AgentAdapter {
  /** Stable adapter id recorded in the spawn registry and presence status. */
  readonly id: AdapterId;
  /** Harness-specific thinking control, absent when that harness exposes none. */
  readonly thinking: ThinkingStrategy | null;
  /** Complete worker launch commands, absent when this harness cannot restrict workers. */
  readonly workerLaunch: WorkerLaunchRole | null;
  /** Complete running-session model control, absent when unsupported. */
  readonly modelControl: ModelControlRole | null;
  /** Complete lifecycle command control, absent when unsupported. */
  readonly lifecycleControl: LifecycleControlRole | null;
  /** Native session-tail reader, absent when this harness has no native transcript. */
  readonly sessionView: SessionViewRole | null;
  /** Trust-store preparation, absent when this harness has no trust store. */
  readonly workspaceTrust: WorkspaceTrustRole | null;
  /** Integration install and diagnosis, absent when this harness has no shim. */
  readonly shim: ShimRole | null;
  /** Persisted default model reader, absent when this harness has none. */
  readonly defaultModel: DefaultModelRole | null;
  /** Harness model catalogue, absent when it exposes no catalogue. */
  readonly models: ModelCatalogueRole | null;
  /** Background catalogue warm-up, absent when listing is synchronous. */
  readonly modelWarm: ModelWarmRole | null;
  readonly question: QuestionRole | null;
  readonly inboxSteering: InboxSteeringRole | null;
  readonly presenceRegistration: PresenceRegistrationRole | null;
  /**
   * Env var this harness's interactive session exports into its subprocesses,
   * letting orch name the session KIND a spawn came from when the caller is not
   * itself an orch agent. Absent when the harness exports none.
   */
  readonly sessionEnvMarker?: string;
  /**
   * Env var carrying this harness's per-session id, when its sessions export
   * one. It is what tells two sessions of the same harness apart — without it a
   * spawn is attributed to the harness kind, never to one session.
   */
  readonly sessionIdEnv?: string;
  /**
   * Env var carrying the PID of this harness's own session process, when its
   * sessions export one. It is what makes a session's orch identity stable: the
   * `orch` CLI is short-lived and its parent is whatever shell the harness ran
   * it from, so `process.ppid` names a different process on every invocation.
   * Absent when the harness exports none - such a session simply has no stable
   * identity, and orch must never guess one from a harness id.
   */
  readonly sessionPidEnv?: string;
  /** Build the normal shell command used to start one agent in an interactive pane. */
  interactiveCmd(opts: SpawnOpts): string;
  /**
   * The same interactive launch as `interactiveCmd`, as RAW argv: the executable
   * first, then unquoted arguments. A plexer that starts the harness itself needs
   * the arguments without a shell's quoting, because it applies its own for the
   * shell it is launching into — herdr does exactly this
   * (`argv = [interactive_agent_executable(kind), ...args]`), and handing it a
   * pre-quoted string exports the quotes as part of the value.
   */
  interactiveArgv(opts: SpawnOpts): readonly string[];
  /** Build argv for a detached backend, including the initial prompt. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[];
  /** Translate native process/session signals into a presence-protocol state. */
  detectState(input: StateDetectionInput): AgentState;
  /** Build the command or presence action used to deliver a steering message. */
  steer(request: SteerRequest): AdapterCommand | undefined;
  /** Build the command or presence action used to answer a blocking question. */
  answer(request: AnswerRequest): AdapterCommand | undefined;
  /** Extract the final assistant text that should be written to `result.json`. */
  extractResult(input: ResultExtractionInput): string | undefined;
}
