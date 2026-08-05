/**
 * The harness surface orch's in-agent control plane runs against.
 *
 * This is orch's OWN port, not any harness's API: nothing here imports a harness
 * package, so `src/agent/**` typechecks, bundles and runs with none of them
 * installed. Each harness's composition root (`extensions/<harness>/index.ts`)
 * imports its own package's types and hands its live API in — pi and omp both
 * satisfy this structurally, and a build that stops satisfying it fails in its
 * own directory rather than silently degrading the shared plane.
 *
 * It is deliberately the SUBSET the control plane actually uses. Widening it to
 * mirror a harness's full ExtensionAPI would re-couple every consumer to whichever
 * harness the extra members were copied from.
 */
import type { ThinkingLevel } from "../policy/model.ts";

/** A model as the harness's own registry hands it back; orch reads two fields and never constructs one. */
export interface HarnessResolvedModel {
  readonly provider: string;
  readonly id: string;
}

/** The session file, id, and message branch orch reconciles presence against. */
export interface HarnessSessionManager {
  getSessionFile(): string | undefined;
  getSessionId(): string | undefined;
  getBranch(): readonly unknown[];
}

/** How much of the model's context window the current session occupies. */
export interface HarnessContextUsage {
  readonly tokens?: number;
  readonly percent?: number;
}

/** The harness's own model registry, keyed the way that harness names models. */
export interface HarnessModelRegistry {
  find(provider: string, id: string): HarnessResolvedModel | undefined;
}

/** Per-invocation state the harness passes to every handler. */
export interface HarnessContext {
  readonly hasUI: boolean;
  readonly model?: HarnessResolvedModel;
  readonly sessionManager: HarnessSessionManager;
  readonly modelRegistry: HarnessModelRegistry;
  readonly ui: { notify(message: string, level: "info" | "error"): void };
  isIdle(): boolean;
  getContextUsage(): HarnessContextUsage | undefined;
}

/** A handler bound to one harness event; the event payload is validated by its reader. */
export type HarnessEventHandler = (event: unknown, ctx: HarnessContext) => void;

/** A slash-command handler; `args` is the raw text after the command name. */
export type HarnessCommandHandler = (args: string | undefined, ctx: HarnessContext) => void;

/** A tool the control plane registers into the agent's own toolset. */
export interface HarnessTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: unknown;
  execute(args: never, ctx: HarnessContext): unknown;
}

/** The harness API surface the control plane binds to. */
export interface HarnessApi {
  on(event: string, handler: HarnessEventHandler): void;
  registerTool(tool: HarnessTool): void;
  registerCommand(name: string, options: { description?: string; handler: HarnessCommandHandler }): void;
  sendUserMessage(content: string, options?: { deliverAs?: "steer" | "followUp" }): void;
  setModel(model: HarnessResolvedModel): Promise<boolean> | void;
  getThinkingLevel(): ThinkingLevel | undefined;
  setThinkingLevel(level: ThinkingLevel, persist?: boolean): void;
  readonly events: unknown;
}

/**
 * What one harness build calls itself and calls its settle signal.
 *
 * The settle event is the run's real "done" — it fires only when the harness will
 * not auto-continue (no retry or compaction pending), unlike `agent_end`. pi
 * spells it `agent_settled`, omp spells it `session_stop`, and each emits only its
 * own; the name belongs to the harness's composition root, never to shared code.
 */
export interface HarnessIdentity {
  /** Adapter id stamped into status.json so orch knows which harness answered. */
  readonly agentId: string;
  /** Event name this build fires when a run settles. */
  readonly settleEvent: string;
}
