import { buildHeadlessArgv, type AgentState } from "../shared/harness.ts";
import { HARNESS_SESSION_ENV } from "../shared/session-env.ts";
import { isRecord, textValue } from "../util.ts";
import { opencodeServerDriver } from "./opencode-server.ts";
import type { AdapterCommand, AgentAdapter, HarnessModel, ModelCatalogue, ResultExtractionInput, SpawnOpts, StateDetectionInput, SteerRequest } from "../types/adapter.ts";

/** opencode lists its models one `provider/model` per line. */
const MODELS_ARGV = ["models"] as const;
const MODEL_LINE = /^[\w.-]+\/\S+$/;

/** The JSON records of `opencode run --format json`, one per line. */
function runRecords(output: string | undefined): Record<string, unknown>[] {
  return (output ?? "").split(/\r?\n/).flatMap((line) => {
    if (!line.trim()) return [];
    try {
      const parsed: unknown = JSON.parse(line);
      return isRecord(parsed) ? [parsed] : [];
    } catch {
      return [];
    }
  });
}

/**
 * opencode adapter. Its `server` form is the integration: orchd starts a private `opencode serve`
 * and drives the agent over its HTTP API and event stream (`opencode-server.ts`), the way t3code
 * does. The `tui` form runs opencode's own terminal program with no presence of its own, and
 * `oneshot` runs `opencode run --format json`.
 */
class OpencodeAdapter implements AgentAdapter {
  readonly id = "opencode" as const;

  /** opencode exports OPENCODE=1 and its session id into every shell it runs. */
  readonly sessionEnvMarker = HARNESS_SESSION_ENV.opencode.marker;
  readonly sessionIdEnv = HARNESS_SESSION_ENV.opencode.sessionId;

  readonly thinking = null;
  readonly workerLaunch = null;
  readonly modelControl = null;
  readonly lifecycleControl = null;
  readonly sessionView = null;
  readonly workspaceTrust = null;
  readonly shim = null;
  readonly settingsFile = null;
  readonly defaultModel = null;
  readonly models = { listModels: (catalogue: ModelCatalogue): readonly HarnessModel[] => this.listModels(catalogue) };
  readonly modelWarm = { warmModels: (catalogue: ModelCatalogue): Promise<void> => catalogue.warm("opencode", MODELS_ARGV) };
  readonly compaction = null;
  readonly bridge = null;
  readonly hooks = null;
  readonly acp = null;
  readonly server = opencodeServerDriver;
  readonly resume = {
    argv: (opts: SpawnOpts, sessionId: string): readonly string[] => [...this.interactiveArgv(opts), "--session", sessionId],
  };
  readonly commandGate = false;

  /** Marker consumed by callers that render heuristic states with a dagger. */
  readonly stateFallback = true;

  /** opencode's terminal program takes no model flag; it starts on its own default. */
  interactiveCmd(opts: SpawnOpts): string {
    return this.interactiveArgv(opts).join(" ");
  }

  interactiveArgv(_opts: SpawnOpts): readonly string[] {
    return ["opencode"];
  }

  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return buildHeadlessArgv("opencode", ["run", "--format", "json"], opts, prompt);
  }

  detectState(input: StateDetectionInput): AgentState {
    if (input.signal || (input.exitCode !== undefined && input.exitCode !== 0)) return "error";
    if (input.exitCode === 0) return "done";
    return "working";
  }

  /** A terminal opencode takes typed input; it has no command that steers it. */
  steer(_request: SteerRequest): AdapterCommand | undefined {
    return undefined;
  }

  /** The text parts of the last assistant message `opencode run --format json` printed. */
  extractResult(input: ResultExtractionInput): string | undefined {
    const parts = runRecords(input.output).flatMap((record) => {
      if (record.type !== "text" || !isRecord(record.part)) return [];
      const text = textValue(record.part.text);
      return text === undefined ? [] : [{ message: textValue(record.part.messageID) ?? "", text }];
    });
    const last = parts.at(-1)?.message;
    const texts = parts.filter((part) => part.message === last).map((part) => part.text);
    return texts.length > 0 ? texts.join("") : textValue(input.output);
  }

  listModels(catalogue: ModelCatalogue): readonly HarnessModel[] {
    return catalogue.read("opencode", MODELS_ARGV).split(/\r?\n/).map((line) => line.trim()).filter((line) => MODEL_LINE.test(line)).map((spec) => ({ spec }));
  }
}

/** Shared opencode adapter instance for command wiring. */
export const opencodeAdapter = new OpencodeAdapter();
