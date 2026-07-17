import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  isRecord,
  loadPresence,
  statusForPresence,
  type PresenceEntry,
} from "../store.ts";
import { parseSession } from "../session.ts";
import { buildExtensionBundle, extensionBundlePath, PI_EXTENSION_NAMES } from "../bridge-bundle.ts";
import { computeCodeHash } from "../daemon/lifecycle.ts";
import { packageRoot } from "../util.ts";
import type { CheckResult, FixDescriptor } from "../doctor-types.ts";
import type {
  AdapterCommand,
  AgentAdapter,
  AgentState,
  AnswerRequest,
  LifecycleVerb,
  ModelRequest,
  ResultExtractionInput,
  SessionView,
  SessionViewInput,
  ShimInstallOpts,
  SpawnOpts,
  StateDetectionInput,
  SteerRequest,
} from "./adapter.ts";

/** State input for pi, identified by its orch presence key. */
export interface PiStateDetectionInput extends StateDetectionInput {
  /** Presence key whose status.json is authoritative. */
  readonly key: string;
}

/** Result input for pi, identified by its orch presence key. */
export interface PiResultExtractionInput extends ResultExtractionInput {
  /** Presence key whose result.json is authoritative. */
  readonly key: string;
}

const AGENT_STATES = new Set<AgentState>([
  "idle",
  "working",
  "blocked",
  "done",
  "error",
  "aborted",
  "exited",
  "unknown",
]);

/**
 * Tools a spawned pi worker may load. Keep this explicit: --no-builtin-tools
 * prevents globally installed tools/extensions from silently expanding it.
 * The bridge registers the four orch_* tools; the state integration registers none.
 */
export const PI_APPROVED_TOOLS = [
  "read",
  "write",
  "edit",
  "bash",
  "orch_ask",
  "orch_agents",
  "orch_send",
  "orch_read",
] as const;

const PI_TOOL_ALLOWLIST = PI_APPROVED_TOOLS.join(",");

function presenceFor(key: string): PresenceEntry | undefined {
  return loadPresence().get(key);
}

// pi's wire format lives here and nowhere else: the bridge extension reads
// inbox.jsonl lines and answer.json from the agent's presence dir.

/** Append one steer/model line to pi's inbox.jsonl in the agent's presence dir. */
function appendInboxLine(presence: PresenceEntry, line: Record<string, unknown>): void {
  fs.mkdirSync(presence.dir, { recursive: true });
  fs.appendFileSync(path.join(presence.dir, "inbox.jsonl"), JSON.stringify({ ...line, ts: new Date().toISOString() }) + "\n");
}

/** Write pi's blocking answer.json in the agent's presence dir. */
function writeAnswerFile(presence: PresenceEntry, text: string): void {
  fs.writeFileSync(path.join(presence.dir, "answer.json"), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
}

/** pi's native slash-commands for each lifecycle verb; these strings live only here. */
const PI_LIFECYCLE_TEXT: Record<LifecycleVerb, string> = {
  reset: "/new",
  reload: "/reload",
  restart: "/quit",
};

function stateFrom(value: unknown): AgentState {
  return typeof value === "string" && AGENT_STATES.has(value as AgentState)
    ? value as AgentState
    : "unknown";
}

/** Pi adapter preserving the existing pi + orchestrator-bridge behavior. */
export class PiAdapter implements AgentAdapter {
  readonly id = "pi" as const;

  /** Pi supports every D4 capability through the bridge and session files. */
  readonly caps = {
    steer: "inbox" as const,
    ask: true,
    setModel: true,
    sessionTail: true,
    lifecycle: ["reset", "reload", "restart"] as const,
  };

  /** Start pi directly in an interactive backend session. */
  interactiveCmd(_opts: SpawnOpts): string {
    return "pi";
  }

  /** Start pi with only the built-ins and orch bridge tools workers need. */
  restrictedInteractiveCmd(opts: SpawnOpts): string {
    return `pi --tools ${opts.tools ?? PI_TOOL_ALLOWLIST} --no-builtin-tools`;
  }

  /** Start the existing pif wrapper with the initial prompt for headless runs. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["pif"];
    if (opts.model) command.push("--model", opts.model);
    command.push(prompt);
    return command;
  }

  /** Start pif with the same explicit worker tool allowlist as interactive pi. */
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["pif", "--tools", opts.tools ?? PI_TOOL_ALLOWLIST, "--no-builtin-tools"];
    if (opts.model) command.push("--model", opts.model);
    command.push(prompt);
    return command;
  }

  /** Read pi's authoritative status.json through the shared presence helpers. */
  detectState(input: PiStateDetectionInput): AgentState {
    const presence = presenceFor(input.key);
    return presence ? stateFrom(statusForPresence(presence)?.state) : "unknown";
  }

  /** Append pi's steer message to its inbox.jsonl. */
  steer(request: SteerRequest): AdapterCommand | undefined {
    const presence = presenceFor(request.key);
    if (!presence) return undefined;
    appendInboxLine(presence, { text: request.text });
    return undefined;
  }

  /** Write pi's blocking answer.json. */
  answer(request: AnswerRequest): AdapterCommand | undefined {
    const presence = presenceFor(request.key);
    if (!presence) return undefined;
    writeAnswerFile(presence, request.text);
    return undefined;
  }

  /** Append pi's model-switch command to its inbox.jsonl. */
  setModel(request: ModelRequest): AdapterCommand | undefined {
    const presence = presenceFor(request.key);
    if (!presence) return undefined;
    appendInboxLine(presence, { cmd: "model", model: request.model });
    return undefined;
  }

  /** Return pi's slash-command text for a lifecycle verb. */
  lifecycleCmd(verb: LifecycleVerb): { text: string } | undefined {
    return { text: PI_LIFECYCLE_TEXT[verb] };
  }

  /** Read result.json first, then fall back to the last assistant session entry. */
  extractResult(input: PiResultExtractionInput): string | undefined {
    const result = presenceFor(input.key)?.result;
    if (isRecord(result) && typeof result.text === "string" && result.text.trim()) return result.text.trim();
    if (!input.sessionPath) return undefined;
    try {
      return parseSession(input.sessionPath).lastAssistant?.trim() ?? undefined;
    } catch {
      return undefined;
    }
  }

  /** Read pi's session tail via parseSession and map it to the shared session-view shape. */
  readSessionView(input: SessionViewInput): SessionView | undefined {
    if (!input.sessionPath) return undefined;
    const data = parseSession(input.sessionPath);
    if (!data.exists) return undefined;
    return {
      model: data.model ?? undefined,
      provider: data.provider ?? undefined,
      thinking: data.thinking ?? undefined,
      task: data.task ?? undefined,
      lastText: data.lastAssistant ?? undefined,
      cost: data.cost,
      tokens: data.tokens,
      turns: data.turns,
    };
  }

  /** Verify the extension links and bundles written by installShim. */
  diagnoseShim(): CheckResult {
    const extensionDir = path.join(os.homedir(), ".pi", "agent", "extensions");
    const bundleFor = new Map(PI_EXTENSION_NAMES.map((name) => [`${name}.js`, extensionBundlePath(packageRoot(), name)]));
    const stale: string[] = [];
    const fixable: string[] = [];
    let extensionDirMissing = false;
    let bundleMissing = false;
    for (const bundle of bundleFor.values()) {
      try { if (!fs.statSync(bundle).isFile()) bundleMissing = true; } catch { bundleMissing = true; }
    }
    try { if (!fs.lstatSync(extensionDir).isDirectory()) extensionDirMissing = false; }
    catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === "ENOENT") extensionDirMissing = true; }
    for (const [name, source] of bundleFor) {
      let sourcePath: string;
      try { sourcePath = fs.realpathSync(source); }
      catch { stale.push(name); fixable.push(name); continue; }
      try {
        const destinationStat = fs.lstatSync(path.join(extensionDir, name));
        if (destinationStat.isSymbolicLink()) {
          if (fs.realpathSync(path.join(extensionDir, name)) !== sourcePath) { stale.push(name); fixable.push(name); }
        } else if (computeCodeHash(path.join(extensionDir, name)) !== computeCodeHash(source)) { stale.push(name); }
      } catch (error: unknown) {
        stale.push(name);
        if ((error as NodeJS.ErrnoException).code === "ENOENT") fixable.push(name);
      }
    }
    const apply: FixDescriptor = {
      description: extensionDirMissing ? `Build bundled bridge, create missing extension dir, and redeploy: ${fixable.join(", ")}` : `Build bundled bridge and redeploy: ${fixable.join(", ")}`,
      apply: () => {
        for (const name of PI_EXTENSION_NAMES) if (fixable.includes(`${name}.js`)) buildExtensionBundle(packageRoot(), name);
        fs.mkdirSync(extensionDir, { recursive: true });
        for (const name of fixable) {
          const destination = path.join(extensionDir, name);
          fs.rmSync(destination.replace(/\\.js$/, ".ts"), { force: true });
          fs.rmSync(destination, { recursive: true, force: true });
          fs.symlinkSync(bundleFor.get(name)!, destination);
        }
      },
    };
    if (bundleMissing) return { id: "pi-extensions", label: "pi extensions", status: "warn", detail: "extension bundle not built; run: bun run build:ext", ...(fixable.length ? { fix: apply } : {}) };
    if (!stale.length) return { id: "pi-extensions", label: "pi extensions", status: "ok", detail: "bundled orchestrator-bridge extension is current" };
    return { id: "pi-extensions", label: "pi extensions", status: "fail", detail: `missing or stale: ${stale.join(", ")}`, ...(fixable.length ? { fix: apply } : {}) };
  }

  /** Link the prebuilt bridge bundle into pi's extension directory, building it from a checkout when absent. */
  installShim(opts?: ShimInstallOpts): void {
    const root = packageRoot();
    const extDir = path.join(os.homedir(), ".pi", "agent", "extensions");
    process.stdout.write("pi extensions:\n");
    for (const name of PI_EXTENSION_NAMES) {
      let bundle = extensionBundlePath(root, name);
      if (!fs.existsSync(bundle)) {
        process.stdout.write(`  building ${name} bundle…\n`);
        bundle = buildExtensionBundle(root, name);
      }
      // Raw .ts links from older installs resolve ../src against the symlink
      // location and break pi at launch; only the bundle may be linked.
      fs.rmSync(path.join(extDir, `${name}.ts`), { force: true });
      const dest = path.join(extDir, `${name}.js`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.rmSync(dest, { recursive: true, force: true });
      if (opts?.copy) fs.cpSync(bundle, dest, { recursive: true });
      else fs.symlinkSync(bundle, dest);
      process.stdout.write(`  ${dest} ${opts?.copy ? "(copy)" : "→ " + bundle}\n`);
    }
  }
}

/** Shared pi adapter instance for command wiring. */
export const piAdapter = new PiAdapter();
