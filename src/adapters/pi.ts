import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  defaultModelString,
  loadPresence,
  readJSON,
  statusForPresence,
  type PresenceEntry,
} from "../presence/store.ts";
import { isRecord } from "../util.ts";
import { blockText, isToolCallContentBlock, parseSession, type SessionEntry, type ToolCallContentBlock } from "../session.ts";
import { buildExtensionBundle, extensionBundlePath, PI_EXTENSION_NAMES } from "../bridge-bundle.ts";
import { computeCodeHash } from "../daemon/lifecycle.ts";
import { packageRoot } from "../util.ts";
import { ANSWER_FILE, INBOX_FILE } from "../presence/schema.ts";
import type { CheckResult, FixDescriptor } from "../check-result.ts";
import type { WorkerPolicy } from "../policy/workers.ts";
import type {
  AdapterCommand,
  AgentAdapter,
  AgentState,
  AnswerRequest,
  LifecycleVerb,
  ModelRequest,
  ResultExtractionInput,
  SessionView,
  SessionViewEntry,
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

/** pi's extension directory orch links its bundled bridge/HUD extensions into.
 * Single source of truth for both the worker launch commands and the
 * extension-staleness doctor check (diagnoseShim/installShim). */
const PI_EXTENSION_DIR = path.join(os.homedir(), ".pi", "agent", "extensions");

/** Basenames of the user's own discovered pi extensions, minus orch's bundles. */
function installedUserExtensions(): { name: string; file: string }[] {
  const orchBundles = new Set<string>(PI_EXTENSION_NAMES);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(PI_EXTENSION_DIR, { withFileTypes: true });
  } catch {
    return []; // no extension dir: the user has none to inherit
  }
  return entries.flatMap((entry) => {
    const name = entry.isDirectory() ? entry.name : entry.name.replace(/\.(ts|js|mjs)$/, "");
    if (name === entry.name && !entry.isDirectory()) return []; // not an extension file
    if (orchBundles.has(name)) return [];
    return [{ name, file: path.join(PI_EXTENSION_DIR, entry.name) }];
  });
}

/**
 * pi's `-e`/`--no-extensions` tokens for one worker. Orch's own bundles always
 * load; whether the user's extensions join them is {@link WorkerPolicy}, not a
 * decision this adapter makes.
 *
 * pi has no per-extension exclude flag, so excluding one means disabling
 * discovery and naming every survivor explicitly. That mapping is pi's business
 * and lives only here.
 */
function workerExtensionArgv(policy: WorkerPolicy | undefined): string[] {
  const argv = ["--no-extensions"];
  for (const name of PI_EXTENSION_NAMES) argv.push("-e", path.join(PI_EXTENSION_DIR, `${name}.js`));
  if (!policy?.inheritExtensions) return argv;
  const excluded = new Set(policy.excludeExtensions);
  for (const extension of installedUserExtensions()) {
    if (!excluded.has(extension.name)) argv.push("-e", extension.file);
  }
  return argv;
}

/** pi's tool-gating flags for one worker: unrestricted unless the policy names an allowlist. */
function workerToolArgv(policy: WorkerPolicy | undefined, tools: string | undefined): string[] {
  const allow = tools ?? (policy?.allowTools.length ? policy.allowTools.join(",") : undefined);
  const argv = policy?.builtinTools === false ? ["--no-builtin-tools"] : [];
  if (allow) argv.push("--tools", allow);
  return argv;
}

function presenceFor(key: string): PresenceEntry | undefined {
  return loadPresence().get(key);
}

// pi's wire format lives here and nowhere else: the bridge extension reads
// inbox.jsonl lines and answer.json from the agent's presence dir.

/** Append one steer/model line to pi's inbox.jsonl in the agent's presence dir. */
function appendInboxLine(presence: PresenceEntry, line: Record<string, unknown>): void {
  fs.mkdirSync(presence.dir, { recursive: true });
  fs.appendFileSync(path.join(presence.dir, INBOX_FILE), JSON.stringify({ ...line, ts: new Date().toISOString() }) + "\n");
}

/** Write pi's blocking answer.json in the agent's presence dir. */
function writeAnswerFile(presence: PresenceEntry, text: string): void {
  fs.writeFileSync(path.join(presence.dir, ANSWER_FILE), JSON.stringify({ text, ts: new Date().toISOString() }) + "\n");
}

const TRUST_FILE = path.join(os.homedir(), ".pi", "agent", "trust.json");

/** True when a launch command actually starts pi's CLI (pi or the pif wrapper). */
export function launchesPi(cmd: string): boolean {
  const bin = cmd.trim().split(/\s+/)[0];
  return bin === "pi" || bin === "pif";
}

function writeTrustEntry(cwd: string) {
  const resolved = path.resolve(cwd);
  const map = readJSON<Record<string, unknown>>(TRUST_FILE) ?? {};
  if (map[resolved] === true) return;
  map[resolved] = true;
  fs.mkdirSync(path.dirname(TRUST_FILE), { recursive: true });
  fs.writeFileSync(TRUST_FILE, JSON.stringify(map, null, 2) + "\n");
  process.stdout.write(`Pre-trusted ${resolved} in ~/.pi/agent/trust.json\n`);
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

/** Pick the most descriptive argument value from a pi tool-call block. */
function toolCallArg(block: ToolCallContentBlock): string {
  const args = block.arguments ?? {};
  for (const key of ["command", "path", "file", "filePath", "subject", "query", "pattern", "action"]) {
    const value = args[key];
    if (value != null) return typeof value === "string" ? value : JSON.stringify(value) ?? "";
  }
  const firstKey = Object.keys(args)[0];
  return firstKey === undefined ? "" : `${firstKey}=${String(args[firstKey])}`;
}

/**
 * Map pi's parsed session entries to the shared per-turn view shape, keeping only
 * content-bearing turns (text, tool calls, or tool results) so `orch tail`'s
 * last-N semantics count rendered rows. This is pi's OWN parser output; it must
 * never be applied to a non-pi session.
 */
function piViewEntries(entries: SessionEntry[]): SessionViewEntry[] {
  const items: SessionViewEntry[] = [];
  for (const entry of entries) {
    if (entry.type !== "message" || !entry.message) continue;
    const message = entry.message;
    const timestamp = entry.timestamp ?? message.timestamp;
    if (message.role === "user") {
      const text = blockText(message.content);
      if (text.trim()) items.push({ role: "user", text, timestamp });
    } else if (message.role === "assistant") {
      const text = blockText(message.content);
      if (text.trim()) { items.push({ role: "assistant", text, timestamp }); continue; }
      const calls = (Array.isArray(message.content) ? message.content : []).filter(isToolCallContentBlock);
      if (calls.length) items.push({ role: "assistant", timestamp, toolCalls: calls.map((call) => ({ name: call.name ?? "tool", arg: toolCallArg(call) })) });
    } else if (message.role === "toolResult") {
      items.push({ role: "tool", tool: message.toolName ?? "tool", text: blockText(message.content), isError: message.isError, timestamp });
    }
  }
  return items;
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
    enforcesCommandLocks: true,
  };

  /** Start pi directly in an interactive backend session. */
  interactiveCmd(opts: SpawnOpts): string {
    return opts.model ? `pi --model ${opts.model}` : "pi";
  }

  /** Start pi as an orch worker: orch's bridge always, plus whatever extensions
   * and tools the worker policy admits. */
  restrictedInteractiveCmd(opts: SpawnOpts): string {
    const argv = ["pi", ...workerToolArgv(opts.workers, opts.tools), ...workerExtensionArgv(opts.workers)];
    if (opts.model) argv.push("--model", opts.model);
    return argv.join(" ");
  }

  /** Start the existing pif wrapper with the initial prompt for headless runs. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["pif"];
    if (opts.model) command.push("--model", opts.model);
    command.push(prompt);
    return command;
  }

  /** Start pif under the same worker policy as an interactive pi worker. */
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["pif", ...workerToolArgv(opts.workers, opts.tools), ...workerExtensionArgv(opts.workers)];
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
    appendInboxLine(presence, { id: request.id, text: request.text });
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
    appendInboxLine(presence, { cmd: "model", model: request.model, id: request.id });
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
      entries: piViewEntries(data.entries),
    };
  }

  /** Verify the extension links and bundles written by installShim. */
  // fallow-ignore-next-line unused-class-member
  diagnoseShim(): CheckResult {
    const extensionDir = PI_EXTENSION_DIR;
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

  /** Pre-trust cwd in pi's trust store when the launch command actually starts pi. */
  preTrustWorkspace(cwd: string, cmd: string): void {
    if (!launchesPi(cmd)) return;
    writeTrustEntry(cwd);
  }

  /** Read pi's persisted default model from ~/.pi/agent/settings.json. */
  defaultModelString(): string | undefined {
    return defaultModelString();
  }

  /** Link the prebuilt bridge bundle into pi's extension directory, building it from a checkout when absent. */
  // fallow-ignore-next-line unused-class-member
  installShim(opts?: ShimInstallOpts): void {
    const root = packageRoot();
    const extDir = PI_EXTENSION_DIR;
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
