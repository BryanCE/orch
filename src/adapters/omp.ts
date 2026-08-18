import * as os from "node:os";
import * as path from "node:path";
import { readModelCatalogue } from "./model-catalogue.ts";
import { isRecord } from "../util.ts";
import {
  answerViaFile,
  bridgeExtensionArgv,
  diagnoseExtensionLink,
  installExtensionLink,
  modelSelectionArgv,
  PI_LIFECYCLE_TEXT,
  piSessionView,
  presenceAgentState,
  resultFromPresenceOrSession,
  setModelViaInbox,
  settingsDefaultModel,
  steerViaInbox,
  toolPolicyArgv,
  type PiResultExtractionInput,
  type PiStateDetectionInput,
  type QuicklistForm,
} from "./pi.ts";
import type { ExtensionName } from "../bridge-bundle.ts";
import type { CheckResult } from "../check-result.ts";
import type {
  AdapterCommand,
  AgentAdapter,
  AgentState,
  AnswerRequest,
  HarnessModel,
  LifecycleVerb,
  ModelRequest,
  SessionView,
  SessionViewInput,
  ShimInstallOpts,
  SpawnOpts,
  SteerRequest,
} from "./adapter.ts";

// orch's omp (oh-my-pi) integration. omp is its OWN harness: its own binary, its
// own config root, its own extension bundle (extensions/omp/), its own settle
// event. What it shares with pi are orch's transport primitives — the presence
// inbox, the answer file, the session format — imported from ./pi.ts rather than
// restated, because those are orch's own protocol and a session shape both CLIs
// write, not per-harness behaviour.
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
function queryOmpModels(): readonly HarnessModel[] {
  return parseOmpModelsOutput(readModelCatalogue("omp", ["models", "--json"]));
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
export class OmpAdapter implements AgentAdapter {
  readonly id = "omp" as const;

  /** omp supports every D4 capability through its bridge and session files. */
  readonly caps = {
    steer: "inbox" as const,
    ask: true,
    setModel: true,
    sessionTail: true,
    registersPresenceOnStart: true,
    lifecycle: ["reset", "reload", "restart"] as const,
    enforcesCommandLocks: true,
  };

  /** Start omp directly in an interactive backend session. */
  interactiveCmd(opts: SpawnOpts): string {
    return ["omp", ...ompModelArgv(opts, "shell")].join(" ");
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
  detectState(input: PiStateDetectionInput): AgentState {
    return presenceAgentState(input.key);
  }

  /** Append omp's steer message to its inbox.jsonl. */
  steer(request: SteerRequest): AdapterCommand | undefined {
    return steerViaInbox(request);
  }

  /** Write omp's blocking answer.json. */
  answer(request: AnswerRequest): AdapterCommand | undefined {
    return answerViaFile(request);
  }

  /** Append omp's model-switch command to its inbox.jsonl. */
  setModel(request: ModelRequest): AdapterCommand | undefined {
    return setModelViaInbox(request);
  }

  /** Return omp's slash-command text for a lifecycle verb. */
  lifecycleCmd(verb: LifecycleVerb): { text: string } | undefined {
    return { text: PI_LIFECYCLE_TEXT[verb] };
  }

  /** Read result.json first, then fall back to the last assistant session entry. */
  extractResult(input: PiResultExtractionInput): string | undefined {
    return resultFromPresenceOrSession(input);
  }

  /** Read omp's session tail and map it to the shared session-view shape. */
  readSessionView(input: SessionViewInput): SessionView | undefined {
    return piSessionView(input);
  }

  /** Verify the extension link and bundle written by installShim. */
  // fallow-ignore-next-line unused-class-member
  diagnoseShim(): CheckResult {
    return diagnoseExtensionLink(this.id, OMP_EXTENSION_DIR, OMP_EXTENSION);
  }

  /** Read omp's persisted default model from ~/.omp/agent/settings.json. */
  defaultModelString(): string | undefined {
    return settingsDefaultModel(OMP_AGENT_DIR);
  }

  /** Report what omp says it can run, asked of omp itself. */
  listModels(): readonly HarnessModel[] {
    return queryOmpModels();
  }

  /** Link the prebuilt omp-bridge bundle into omp's extension directory. */
  // fallow-ignore-next-line unused-class-member
  installShim(opts?: ShimInstallOpts): void {
    installExtensionLink(this.id, OMP_EXTENSION_DIR, OMP_EXTENSION, opts);
  }
}

/** Shared omp adapter instance for command wiring. */
export const ompAdapter = new OmpAdapter();
