import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { readModelCatalogue, warmModelCatalogue } from "./model-catalogue.ts";
import { loadPresence, readJSON, statusForPresence } from "../presence/store.ts";
import { errnoCode, isRecord, shellQuote } from "../util.ts";
import { blockText, isToolCallContentBlock, parseSession } from "../session.ts";
import { extensionBundlePath, EXTENSION_NAMES } from "../bridge-bundles/metadata.ts";
import { computeCodeHash } from "../daemon/lifecycle.ts";
import { packageRoot } from "../util.ts";
import { appendInbox } from "../presence/inbox.ts";
import { writeAnswer } from "../presence/writer.ts";
import { isAgentState } from "../agent-state.ts";
import type { AgentState } from "./adapter.ts";
import { HARNESS_SESSION_ENV } from "./session-env.ts";
import type { AdapterCommand, AgentAdapter, AnswerRequest, HarnessModel, LifecycleVerb, ModelRequest, PiResultExtractionInput, PiStateDetectionInput, QuicklistForm, SessionView, SessionViewEntry, SessionViewInput, ShimInstallOpts, SpawnOpts, SteerRequest, ThinkingStrategy } from "../types/adapter.ts";
import type { PresenceEntry } from "../types/presence.ts";
import type { ThinkingLevel, WorkerPolicy } from "../types/policy.ts";
import type { CheckResult, FixDescriptor } from "../types/doctor.ts";
import type { ExtensionName, SessionEntry, ToolCallContentBlock } from "../types/core.ts";

/** pi's own config root, and the files under it orch reads or writes. */
const PI_AGENT_DIR = path.join(os.homedir(), ".pi", "agent");
const PI_EXTENSION_DIR = path.join(PI_AGENT_DIR, "extensions");
const PI_TRUST_FILE = path.join(PI_AGENT_DIR, "trust.json");
/** pi's shipped bundle, built from extensions/pi/. */
const PI_EXTENSION: ExtensionName = "pi-bridge";
/** Binaries that start pi: the CLI and orch's `pif` wrapper. */
const PI_BINARIES = ["pi", "pif"];

const EXTENSION_SUFFIXES = [".ts", ".js", ".mjs"];

/** A directory is an extension only when it has an index entrypoint; helper
 *  directories beside real extensions have none, and naming one on the harness's
 *  command line makes it refuse to start at all. */
function directoryExtensionIndex(directory: string): string | undefined {
  return EXTENSION_SUFFIXES
    .map((suffix) => path.join(directory, `index${suffix}`))
    .find((candidate) => fs.existsSync(candidate));
}

/** Basenames of the user's own discovered extensions, minus orch's bundles. */
function installedUserExtensions(directory: string): { name: string; file: string }[] {
  const orchBundles = new Set<string>(EXTENSION_NAMES);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return []; // no extension dir: the user has none to inherit
  }
  return entries.flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const name = entry.name;
      return orchBundles.has(name) || !directoryExtensionIndex(file) ? [] : [{ name, file }];
    }
    const suffix = EXTENSION_SUFFIXES.find((candidate) => entry.name.endsWith(candidate));
    if (!suffix) return [];
    const name = entry.name.slice(0, -suffix.length);
    return orchBundles.has(name) ? [] : [{ name, file }];
  });
}

/**
 * The `-e`/`--no-extensions` tokens for one worker of a pi-shaped CLI. Orch's own
 * bundle always loads; whether the user's extensions join it is
 * {@link WorkerPolicy}, not a decision an adapter makes.
 *
 * These CLIs have no per-extension exclude flag, so excluding one means disabling
 * discovery and naming every survivor explicitly.
 */
export function bridgeExtensionArgv(
  extensionDir: string,
  extension: ExtensionName,
  policy: WorkerPolicy | undefined,
): string[] {
  const argv = ["--no-extensions", "-e", path.join(extensionDir, `${extension}.js`)];
  if (!policy?.inheritExtensions) return argv;
  const excluded = new Set(policy.excludeExtensions);
  for (const installed of installedUserExtensions(extensionDir)) {
    if (!excluded.has(installed.name)) argv.push("-e", installed.file);
  }
  return argv;
}

/**
 * The tokens that pick a launch model and, when configured, hand the harness the quicklist its
 * own picker cycles. Each harness names its two flags; the quicklist is one comma-separated
 * argument. It is never a gate — the launch model was ruled on long before a command is built,
 * and a model outside the quicklist stays launchable.
 */
export function modelSelectionArgv(
  flags: { model: string; cycle: string },
  opts: SpawnOpts,
  form: QuicklistForm,
): string[] {
  const argv = opts.model ? [flags.model, opts.model] : [];
  const patterns = opts.preferredModels?.length ? opts.preferredModels.join(",") : "";
  if (patterns) argv.push(flags.cycle, form === "shell" ? shellQuote(patterns) : patterns);
  return argv;
}

/** Tool-gating flags for one worker: unrestricted unless the policy names an allowlist.
 *  `dropBuiltinTools` is the harness's own spelling of "built-ins off, extension tools on". */
export function toolPolicyArgv(
  dropBuiltinTools: string,
  policy: WorkerPolicy | undefined,
  tools: string | undefined,
): string[] {
  const allow = tools ?? (policy?.allowTools.length ? policy.allowTools.join(",") : undefined);
  const argv = policy?.builtinTools === false ? [dropBuiltinTools] : [];
  if (allow) argv.push("--tools", allow);
  return argv;
}

export function presenceFor(key: string): PresenceEntry | undefined {
  return loadPresence().get(key);
}

// pi's wire format lives here and nowhere else: the bridge extension reads
// inbox.jsonl lines and answer.json from the agent's presence dir.

/** The presence state a pi-shaped harness's bridge last wrote for this agent. */
export function presenceAgentState(key: string): AgentState {
  const presence = presenceFor(key);
  return presence ? stateFrom(statusForPresence(presence)?.state) : "unknown";
}

/** Steer a running agent by appending to the inbox its bridge drains. */
export function steerViaInbox(request: SteerRequest): AdapterCommand | undefined {
  const presence = presenceFor(request.key);
  if (presence) appendInbox(presence.dir, { id: request.id, text: request.text, ts: new Date().toISOString() });
  return undefined;
}

/** Unblock an asking agent by writing the answer file its bridge waits on. */
export function answerViaFile(request: AnswerRequest): AdapterCommand | undefined {
  const presence = presenceFor(request.key);
  if (presence) writeAnswer(presence.dir, request.text);
  return undefined;
}

/** Retarget a running agent's model through the same inbox transport as a steer. */
export function setModelViaInbox(request: ModelRequest): AdapterCommand | undefined {
  const presence = presenceFor(request.key);
  if (presence) appendInbox(presence.dir, { cmd: "model", model: request.model, id: request.id, ts: new Date().toISOString() });
  return undefined;
}

/**
 * Parse pi's supported `--list-models` table into orch's provider/id vocabulary.
 * pi exposes its built-in and authenticated custom registry through this CLI
 * command rather than a stable models file; the adapter owns this parsing.
 */
export function parsePiModelsOutput(output: string): readonly HarnessModel[] {
  const lines = output
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines.findIndex((line) => /^provider\s+model\s+context\b/.test(line));
  if (header < 0) return [];

  const specs = new Set<string>();
  for (const line of lines.slice(header + 1)) {
    const columns = line.split(/\s+/);
    const [provider, model] = columns;
    if (columns.length < 6 || !provider || !model || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(provider)) continue;
    specs.add(`${provider}/${model}`);
  }
  return [...specs].map((spec) => ({ spec }));
}

/** Ask pi itself which authenticated models it can run. */
const PI_MODELS_ARGV = ["--list-models"] as const;

function queryPiModels(): readonly HarnessModel[] {
  return parsePiModelsOutput(readModelCatalogue("pi", PI_MODELS_ARGV));
}

/** True when a launch command starts one of the named binaries. */
function launchesBinary(binaries: readonly string[], cmd: string): boolean {
  const executable = cmd.trim().split(/\s+/)[0];
  return executable !== undefined && binaries.includes(executable);
}

/** Pre-approve a workspace in a harness's trust store so its first launch does not block. */
function writeTrustEntry(trustFile: string, cwd: string) {
  const resolved = path.resolve(cwd);
  const map = readJSON<Record<string, unknown>>(trustFile) ?? {};
  if (map[resolved] === true) return;
  map[resolved] = true;
  fs.mkdirSync(path.dirname(trustFile), { recursive: true });
  fs.writeFileSync(trustFile, JSON.stringify(map, null, 2) + "\n");
  process.stdout.write(`Pre-trusted ${resolved} in ${trustFile}\n`);
}

/** The `provider/model` a pi-flavour build launches on, or nothing when it names no
 *  model of its own — inventing one hands orch a spec no registry can resolve. */
export function settingsDefaultModel(agentDir: string): string | undefined {
  const source = readJSON<Record<string, unknown>>(path.join(agentDir, "settings.json")) ?? {};
  if (typeof source.defaultModel !== "string" || !source.defaultModel) return undefined;
  const provider = typeof source.defaultProvider === "string" ? source.defaultProvider : "openai-codex";
  return `${provider}/${source.defaultModel}`;
}

/** The slash-commands a pi-shaped CLI answers for each lifecycle verb. */
export const PI_LIFECYCLE_TEXT: Record<LifecycleVerb, string> = {
  reset: "/new",
  reload: "/reload",
  restart: "/quit",
};

function stateFrom(value: unknown): AgentState {
  return isAgentState(value) ? value : "unknown";
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

/** Verify one shipped bundle is linked into a harness's extension directory and current. */
export function diagnoseExtensionLink(harness: string, extensionDir: string, extension: ExtensionName): CheckResult {
  const id = `${harness}-extensions`;
  const label = `${harness} extensions`;
  const file = `${extension}.js`;
  const source = extensionBundlePath(packageRoot(), extension);
  const destination = path.join(extensionDir, file);

  let bundleMissing = false;
  try { bundleMissing = !fs.statSync(source).isFile(); } catch { bundleMissing = true; }
  let extensionDirMissing = false;
  try { fs.lstatSync(extensionDir); }
  catch (error: unknown) { extensionDirMissing = errnoCode(error) === "ENOENT"; }

  const { stale, fixable } = linkState(source, destination);
  const apply: FixDescriptor = {
    description: extensionDirMissing
      ? `Create missing extension dir and redeploy: ${file}`
      : `Redeploy: ${file}`,
    apply: () => installExtensionLink(harness, extensionDir, extension, { copy: deployedAsCopy(destination) }),
  };
  if (bundleMissing) return {
    id,
    label,
    status: "warn",
    detail: `missing/stale shipped extension bundle: ${source}; fix: run the user's build: bun run build:orch:dev`,
  };
  if (!stale) return { id, label, status: "ok", detail: `bundled ${extension} extension is current` };
  return { id, label, status: "fail", detail: `missing or stale: ${file}`, ...(fixable ? { fix: apply } : {}) };
}

/** Whether a linked bundle is out of date, and whether redeploying would repair it. */
function linkState(source: string, destination: string): { stale: boolean; fixable: boolean } {
  let sourcePath: string;
  try { sourcePath = fs.realpathSync(source); }
  catch { return { stale: true, fixable: true }; }
  try {
    if (fs.lstatSync(destination).isSymbolicLink()) {
      const linked = fs.realpathSync(destination) === sourcePath;
      return { stale: !linked, fixable: !linked };
    }
    // A copy deployment (no symlink support) goes stale on every orch update;
    // re-copying the shipped bundle is exactly the repair.
    const copied = computeCodeHash(destination) !== computeCodeHash(source);
    return { stale: copied, fixable: copied };
  } catch (error: unknown) {
    return { stale: true, fixable: errnoCode(error) === "ENOENT" };
  }
}

/** A deployed artifact that is a real file keeps copy mode on redeploy. */
function deployedAsCopy(destination: string): boolean {
  try { return !fs.lstatSync(destination).isSymbolicLink(); }
  catch { return false; }
}

/** Link one prebuilt bundle into a harness's extension directory; never build at runtime. */
export function installExtensionLink(
  harness: string,
  extensionDir: string,
  extension: ExtensionName,
  opts?: ShimInstallOpts,
): void {
  const root = packageRoot();
  process.stdout.write(`${harness} extensions:\n`);
  const bundle = extensionBundlePath(root, extension);
  let bundleAvailable = false;
  try { bundleAvailable = fs.statSync(bundle).isFile(); } catch { /* diagnosis below names the user build fix */ }
  if (!bundleAvailable) {
    throw new Error(`missing/stale shipped extension bundle: ${bundle}; fix: run the user's build: bun run build:orch:dev`);
  }
  const destination = path.join(extensionDir, `${extension}.js`);
  fs.mkdirSync(extensionDir, { recursive: true });
  fs.rmSync(destination, { recursive: true, force: true });
  if (opts?.copy) fs.cpSync(bundle, destination, { recursive: true });
  else fs.symlinkSync(bundle, destination);
  process.stdout.write(`  ${destination} ${opts?.copy ? "(copy)" : "-> " + bundle}\n`);
}

/** result.json first, then the last assistant entry of the session file. */
export function resultFromPresenceOrSession(input: PiResultExtractionInput): string | undefined {
  const result = presenceFor(input.key)?.result;
  if (isRecord(result) && typeof result.text === "string" && result.text.trim()) return result.text.trim();
  if (!input.sessionPath) return undefined;
  try {
    return parseSession(input.sessionPath).lastAssistant?.trim() ?? undefined;
  } catch {
    return undefined;
  }
}

/** Read a pi-format session tail and map it to orch's shared session-view shape. */
export function piSessionView(input: SessionViewInput): SessionView | undefined {
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

/** Build one pi launch composition. Worker routes opt into orch's bridge, tools, and
 * inherited user extensions; the ordinary interactive form remains the bare harness. */
function piLaunchArgv(opts: SpawnOpts, worker: boolean, binary: "pi" | "pif", prompt: string | undefined, form: QuicklistForm, thinking?: ThinkingStrategy | null): string[] {
  const argv: string[] = [binary];
  if (worker) argv.push(...piToolArgv(opts), ...piExtensionArgv(opts));
  argv.push(...piModelArgv(opts, form));
  if (thinking && opts.thinking !== undefined) argv.push(...thinking.launchArgs(opts.thinking));
  if (prompt !== undefined) argv.push(prompt);
  return argv;
}

/** Adapter for pi (@earendil-works/pi-coding-agent), driven through orch's pi-bridge extension. */
export class PiAdapter implements AgentAdapter {
  readonly id = "pi" as const;

  /** pi exposes a neutral CLI flag for launch-time thinking effort. */
  readonly thinking: ThinkingStrategy = {
    launchArgs: (level: ThinkingLevel): readonly string[] => ["--thinking", level],
    set: (_level: ThinkingLevel): void => {
      // Running-session changes are delivered by the pi bridge's control plane.
    },
  };

  /** pi exports these into every subprocess of an interactive session. */
  readonly sessionEnvMarker = HARNESS_SESSION_ENV.pi.marker;
  readonly sessionIdEnv = HARNESS_SESSION_ENV.pi.sessionId;

  readonly workerLaunch = {
    restrictedInteractiveCmd: (opts: SpawnOpts): string => this.restrictedInteractiveCmd(opts),
    restrictedHeadlessCmd: (prompt: string, opts: SpawnOpts): string[] => this.restrictedHeadlessCmd(prompt, opts),
  };
  readonly modelControl = { setModel: (request: ModelRequest): AdapterCommand | undefined => this.setModel(request) };
  readonly lifecycleControl = { lifecycleCmd: (verb: LifecycleVerb): { text: string } | undefined => this.lifecycleCmd(verb) };
  readonly sessionView = { readSessionView: (input: SessionViewInput): SessionView | undefined => this.readSessionView(input) };
  readonly workspaceTrust = { preTrustWorkspace: (cwd: string, cmd: string): void => this.preTrustWorkspace(cwd, cmd) };
  readonly shim = {
    installShim: (opts?: ShimInstallOpts): void => this.installShim(opts),
    diagnoseShim: (): CheckResult => this.diagnoseShim
      ? this.diagnoseShim()
      : { id: "pi-extensions", label: "pi extensions", status: "skip", detail: "pi integration shim disabled" },
  };
  readonly defaultModel = { defaultModelString: (): string | undefined => this.defaultModelString() };
  readonly models = { listModels: (): readonly HarnessModel[] => this.listModels() };
  readonly modelWarm = { warmModels: (): Promise<void> => this.warmModels() };
  readonly question = { answer: (request: AnswerRequest): AdapterCommand | undefined => this.answer(request) };
  readonly inboxSteering = { steer: (request: SteerRequest): AdapterCommand | undefined => this.steer(request) };
  readonly presenceRegistration = { isRegistered: (key: string): boolean => presenceFor(key) !== undefined };

  /** Start pi directly in an interactive backend session. Worker options use the same
   * composition as restricted launches, so tile/spawn cannot silently drop extensions. */
  interactiveCmd(opts: SpawnOpts): string {
    return piLaunchArgv(opts, opts.workers !== undefined, "pi", undefined, "shell", this.thinking).join(" ");
  }

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    return piLaunchArgv(opts, opts.workers !== undefined, "pi", undefined, "argv", this.thinking);
  }

  /** Start pi as an orch worker: orch's bridge always, plus whatever extensions
   * and tools the worker policy admits. */
  restrictedInteractiveCmd(opts: SpawnOpts): string {
    return piLaunchArgv(opts, true, "pi", undefined, "shell", this.thinking).join(" ");
  }

  /** Start the pif wrapper with the initial prompt for headless runs. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return piLaunchArgv(opts, opts.workers !== undefined, "pif", prompt, "argv", this.thinking);
  }

  /** Start pif under the same worker policy as an interactive pi worker. */
  restrictedHeadlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return piLaunchArgv(opts, true, "pif", prompt, "argv", this.thinking);
  }

  /** Read pi's authoritative status.json through the shared presence helpers. */
  detectState(input: PiStateDetectionInput): AgentState {
    return presenceAgentState(input.key);
  }

  /** Append pi's steer message to its inbox.jsonl. */
  steer(request: SteerRequest): AdapterCommand | undefined {
    return steerViaInbox(request);
  }

  /** Write pi's blocking answer.json. */
  answer(request: AnswerRequest): AdapterCommand | undefined {
    return answerViaFile(request);
  }

  /** Append pi's model-switch command to its inbox.jsonl. */
  setModel(request: ModelRequest): AdapterCommand | undefined {
    return setModelViaInbox(request);
  }

  /** Return pi's slash-command text for a lifecycle verb. */
  lifecycleCmd(verb: LifecycleVerb): { text: string } | undefined {
    return { text: PI_LIFECYCLE_TEXT[verb] };
  }

  /** Read result.json first, then fall back to the last assistant session entry. */
  extractResult(input: PiResultExtractionInput): string | undefined {
    return resultFromPresenceOrSession(input);
  }

  /** Read pi's session tail via parseSession and map it to the shared session-view shape. */
  readSessionView(input: SessionViewInput): SessionView | undefined {
    return piSessionView(input);
  }

  /** Verify the extension link and bundle written by installShim. */
  diagnoseShim(): CheckResult {
    return diagnoseExtensionLink(this.id, PI_EXTENSION_DIR, PI_EXTENSION);
  }

  /** Pre-trust cwd in pi's trust store when the launch command actually starts pi. */
  preTrustWorkspace(cwd: string, cmd: string): void {
    if (!launchesBinary(PI_BINARIES, cmd)) return;
    writeTrustEntry(PI_TRUST_FILE, cwd);
  }

  /** Read pi's persisted default model from ~/.pi/agent/settings.json. */
  defaultModelString(): string | undefined {
    return settingsDefaultModel(PI_AGENT_DIR);
  }

  /** Ask pi's own registry through its supported model-listing command. */
  listModels(): readonly HarnessModel[] {
    return queryPiModels();
  }

  /** pi's registry is a shell-out; start it early so setup's next prompt covers the wait. */
  warmModels(): Promise<void> {
    return warmModelCatalogue("pi", PI_MODELS_ARGV);
  }

  /** Link the prebuilt bridge bundle into pi's extension directory. */
  installShim(opts?: ShimInstallOpts): void {
    installExtensionLink(this.id, PI_EXTENSION_DIR, PI_EXTENSION, opts);
  }
}

/** pi's `-e` tokens for one worker. */
function piExtensionArgv(opts: SpawnOpts): string[] {
  return bridgeExtensionArgv(PI_EXTENSION_DIR, PI_EXTENSION, opts.workers);
}

/** pi's tool-gating tokens for one worker; pi spells the built-ins switch --no-builtin-tools. */
function piToolArgv(opts: SpawnOpts): string[] {
  return toolPolicyArgv("--no-builtin-tools", opts.workers, opts.tools);
}

/** pi's model tokens: `--model` selects the session's model, `--models` fills its Ctrl+P cycle. */
function piModelArgv(opts: SpawnOpts, form: QuicklistForm): string[] {
  return modelSelectionArgv({ model: "--model", cycle: "--models" }, opts, form);
}

/** Shared pi adapter instance for command wiring. */
export const piAdapter = new PiAdapter();
