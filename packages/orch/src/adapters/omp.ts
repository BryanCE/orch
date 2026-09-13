import * as os from "node:os";
import * as path from "node:path";
import { readModelCatalogue, warmModelCatalogue } from "./model-catalogue.ts";
import { isRecord } from "../util.ts";
import { adapterLogger, bridgeExtensionArgv, diagnoseExtensionLink, installExtensionLink, modelSelectionArgv, PI_LIFECYCLE_TEXT, piSessionView, presenceAgentState, presenceFor, resultFromPresenceOrSession, settingsDefaultModel, toolPolicyArgv } from "./pi.ts";
import type { AgentState } from "./adapter.ts";
import { HARNESS_SESSION_ENV } from "./session-env.ts";
import type { AdapterCommand, AgentAdapter, BridgeRole, HarnessModel, LifecycleVerb, ModelRequest, PiResultExtractionInput, PiStateDetectionInput, QuicklistForm, SessionView, SessionViewInput, ShimInstallOpts, SpawnOpts, SteerRequest } from "../types/adapter.ts";
import type { CheckResult } from "../types/doctor.ts";
import type { ExtensionName, Logger, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";

// orch's omp (oh-my-pi) integration. omp is its OWN harness: its own binary, its
// own config root, its own extension bundle (extensions/omp/), and its own settle
// event. It shares orch's presence and session helpers with pi.
//
// Nothing here reads a pi path or runs a pi binary, and pi.ts names nothing of
// omp's. A machine with omp and no pi installed runs this whole file.

/** omp's own config root, and the directory under it orch links its bundle into. */
const OMP_AGENT_DIR = path.join(os.homedir(), ".omp", "agent");
const OMP_EXTENSION_DIR = path.join(OMP_AGENT_DIR, "extensions");
/** omp's shipped bundle, built from extensions/omp/. */
const OMP_EXTENSION: ExtensionName = "omp-bridge";

/** One row of `omp models --json`. */
function modelRow(entry: unknown): HarnessModel[] {
  if (!isRecord(entry) || typeof entry.provider !== "string" || typeof entry.id !== "string") return [];
  if (!entry.provider || !entry.id) return [];
  return [{
    spec: `${entry.provider}/${entry.id}`,
    ...(typeof entry.name === "string" && entry.name ? { label: entry.name } : {}),
  }];
}

/** Ask omp itself what it can run; its registry is a private SQLite database, so its CLI is
 *  the only supported reader. */
const OMP_MODELS_ARGV = ["models", "--json"] as const;

function queryOmpModels(orchDir: OrchDir): readonly HarnessModel[] {
  return parseOmpModelsOutput(readModelCatalogue(orchDir, adapterLogger(orchDir), "omp", OMP_MODELS_ARGV));
}

/** Map `omp models --json` onto orch's provider/id vocabulary; that shape lives only here. */
function parseOmpModelsOutput(stdout: string): readonly HarnessModel[] {
  let payload: unknown;
  try {
    payload = JSON.parse(stdout);
  } catch {
    return [];
  }
  if (!isRecord(payload) || !Array.isArray(payload.models)) return [];
  return payload.models.flatMap(modelRow);
}

/** omp's `-e` tokens for one worker. */
function ompExtensionArgv(opts: SpawnOpts): string[] {
  return bridgeExtensionArgv(OMP_EXTENSION_DIR, OMP_EXTENSION, opts.workers);
}

/** omp's tool-gating tokens for one worker. omp's `--no-tools` drops built-in tools
 *  and keeps extension tools; it has no `--no-builtin-tools`. */
function ompToolArgv(opts: SpawnOpts): string[] {
  return toolPolicyArgv("--no-tools", opts.workers, opts.tools);
}

/** omp's model tokens: `--model` selects the session's model, `--models` fills its Ctrl+P cycle. */
function ompModelArgv(opts: SpawnOpts, form: QuicklistForm): string[] {
  return modelSelectionArgv({ model: "--model", cycle: "--models" }, opts, form);
}

/** Adapter for omp (@oh-my-pi/pi-coding-agent), driven through orch's omp-bridge extension. */
class OmpAdapter implements AgentAdapter {
  readonly id = "omp" as const;

  /** omp exports its session id into subprocesses; it is both marker and identity. */
  readonly sessionEnvMarker = HARNESS_SESSION_ENV.omp.marker;
  readonly sessionIdEnv = HARNESS_SESSION_ENV.omp.sessionId;

  readonly thinking = null;
  readonly workerLaunch = {
    restrictedInteractiveCmd: (opts: SpawnOpts): string => this.restrictedInteractiveCmd(opts),
    restrictedHeadlessCmd: (prompt: string, opts: SpawnOpts): string[] => this.restrictedHeadlessCmd(prompt, opts),
  };
  readonly modelControl = { setModel: (request: ModelRequest): AdapterCommand | undefined => this.setModel(request) };
  readonly lifecycleControl = { lifecycleCmd: (verb: LifecycleVerb): { text: string } | undefined => this.lifecycleCmd(verb) };
  readonly sessionView = { readSessionView: (input: SessionViewInput): SessionView | undefined => this.readSessionView(input) };
  readonly workspaceTrust = null;
  readonly shim = {
    installShim: (orchDir: OrchDir, _settings: OrchSettings, _logger: Logger, opts?: ShimInstallOpts): void => this.installShim(orchDir, opts),
    diagnoseShim: (orchDir: OrchDir, _settings: OrchSettings, _logger: Logger): CheckResult => this.diagnoseShim(orchDir),
  };
  readonly defaultModel = { defaultModelString: (): string | undefined => this.defaultModelString() };
  readonly models = { listModels: (): readonly HarnessModel[] => this.listModels() };
  readonly modelWarm = { warmModels: (): Promise<void> => this.warmModels() };
  readonly bridge: BridgeRole = { takes: ["dispatch", "steer", "answer", "model"] };
  readonly presenceRegistration = { isRegistered: (key: string, orchDir: OrchDir): boolean => presenceFor(key, orchDir) !== undefined };

  /** Start omp directly in an interactive backend session. */
  interactiveCmd(opts: SpawnOpts): string {
    return ["omp", ...ompModelArgv(opts, "shell")].join(" ");
  }

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    return ["omp", ...ompModelArgv(opts, "argv")];
  }

  /** Start omp as an orch worker: orch's bridge always, plus whatever extensions
   * and tools the worker policy admits. */
  restrictedInteractiveCmd(opts: SpawnOpts): string {
    return ["omp", ...ompToolArgv(opts), ...ompExtensionArgv(opts), ...ompModelArgv(opts, "shell")].join(" ");
  }

  /** omp's single binary serves headless runs too — no launcher wrapper. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return ["omp", ...ompModelArgv(opts, "argv"), prompt];
  }

  /** Start omp headless under the same worker policy as an interactive omp worker. */
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return ["omp", ...ompToolArgv(opts), ...ompExtensionArgv(opts), ...ompModelArgv(opts, "argv"), prompt];
  }

  /** Read omp's authoritative status.json through the shared presence helpers. */
  detectState(input: PiStateDetectionInput, orchDir: OrchDir): AgentState {
    return presenceAgentState(input.key, orchDir);
  }

  /** The bridge takes steers; nothing to run. */
  steer(_request: SteerRequest): AdapterCommand | undefined {
    return undefined;
  }

  /** The bridge applies model deliveries; nothing to run. */
  setModel(_request: ModelRequest): AdapterCommand | undefined {
    return undefined;
  }

  /** Return omp's slash-command text for a lifecycle verb. */
  lifecycleCmd(verb: LifecycleVerb): { text: string } | undefined {
    return { text: PI_LIFECYCLE_TEXT[verb] };
  }

  /** Read results.jsonl first, then fall back to the last assistant session entry. */
  extractResult(input: PiResultExtractionInput, orchDir: OrchDir): string | undefined {
    return resultFromPresenceOrSession(input, orchDir);
  }

  /** Read omp's session tail and map it to the shared session-view shape. */
  readSessionView(input: SessionViewInput): SessionView | undefined {
    return piSessionView(input);
  }

  /** Verify the extension link and bundle written by installShim. */
  diagnoseShim(_orchDir: OrchDir): CheckResult {
    return diagnoseExtensionLink(this.id, OMP_EXTENSION_DIR, OMP_EXTENSION);
  }

  /** Read omp's persisted default model from ~/.omp/agent/settings.json. */
  defaultModelString(): string | undefined {
    return settingsDefaultModel(OMP_AGENT_DIR);
  }

  /** Report what omp says it can run, asked of omp itself. */
  listModels(orchDir?: OrchDir): readonly HarnessModel[] {
    return orchDir === undefined ? [] : queryOmpModels(orchDir);
  }

  /** omp's registry is a shell-out; start it early so setup's next prompt covers the wait. */
  warmModels(orchDir?: OrchDir): Promise<void> {
    return orchDir === undefined ? Promise.resolve() : warmModelCatalogue("omp", OMP_MODELS_ARGV, orchDir);
  }

  /** Link the prebuilt omp-bridge bundle into omp's extension directory. */
  installShim(_orchDir: OrchDir, opts?: ShimInstallOpts): void {
    installExtensionLink(this.id, OMP_EXTENSION_DIR, OMP_EXTENSION, opts);
  }
}

/** Shared omp adapter instance for command wiring. */
export const ompAdapter = new OmpAdapter();
