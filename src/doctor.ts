import * as filesystem from "node:fs";
import { execFile } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { loadConfig, type HostConfig } from "./config.ts";
import { createNotifierRegistry, loadSinks, type Sink } from "./notify.ts";
import { computeCodeHash, readDaemonLock } from "./daemon/lifecycle.ts";
import { rpcCall } from "./daemon/rpc.ts";
import { runSSH, type SshResult } from "./remote.ts";
import { bridgeBundlePath, buildBridgeBundle } from "./bridge-bundle.ts";
import { allBackends } from "./backends/registry.ts";
import { tryParseIdentity } from "./backends/identity.ts";
import { presenceDir, presenceKeyFromDirectoryName } from "./store.ts";
import { packageRoot } from "./util.ts";

export interface FixDescriptor {
  description: string;
  apply(): void;
  /** True for fixes that delete data. UIs must render these clearly and never pre-select them. */
  destructive?: boolean;
}

export interface DoctorBackendReport {
  id: string;
  available: boolean;
  insideSession: boolean;
  panes: boolean;
  focusable: boolean;
  canSendKeys: boolean;
  workspace: string | null;
}

export interface IgnoredPresenceRecord {
  path: string;
  reason: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "skip";
  detail: string;
  fix?: FixDescriptor;
  backends?: DoctorBackendReport[];
  ignoredRecords?: IgnoredPresenceRecord[];
}

export type BinaryStatus = Record<string, boolean>;

const repoDir = packageRoot();

function onPath(command: string): boolean {
  const extensions = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    for (const extension of extensions) {
      try {
        filesystem.accessSync(path.join(directory, command + extension), filesystem.constants.X_OK);
        return true;
      } catch {}
    }
  }
  return false;
}

function pidAlive(pid: unknown): boolean {
  if (typeof pid !== "number" || !Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return error.code === code;
}

function readJson(file: string): unknown {
  return JSON.parse(filesystem.readFileSync(file, "utf8"));
}

function commandOutput(command: string, args: string[]): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      const err = error as (NodeJS.ErrnoException & { code?: number | string }) | null;
      if (err && typeof err.code !== "number") {
        resolve({ ok: false, output: err.message });
        return;
      }
      const code = err && typeof err.code === "number" ? err.code : 0;
      resolve({ ok: code === 0, output: (stdout || stderr).trim() });
    });
  });
}

export function binaryStatus(): BinaryStatus {
  // Plexer availability belongs to the backend registry, not this runtime check.
  return { bun: onPath("bun"), pi: onPath("pi") };
}

export function checkBins(bins: BinaryStatus): CheckResult {
  const missing = ["bun", "pi"].filter((bin) => !bins[bin]);
  if (!missing.length) return { id: "bins", label: "Required binaries", status: "ok", detail: "bun and pi are on PATH" };
  if (!bins.bun) return { id: "bins", label: "Required binaries", status: "fail", detail: "bun is not on PATH" };
  return {
    id: "bins",
    label: "Required binaries",
    status: "warn",
    detail: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not on PATH`,
  };
}

function readAgentEntries(orchDir: string): filesystem.Dirent[] | undefined {
  try {
    return filesystem.readdirSync(path.join(orchDir, "agents"), { withFileTypes: true });
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

function humanAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/** Recover the logical pane key from a presence dir name (Windows escapes ':' and '%'). */
function keyFromDirName(name: string): string {
  return presenceKeyFromDirectoryName(name);
}

/** One human-legible line identifying a presence dir — so nobody deletes a live session blind. */
function describePresenceDir(agentsDir: string, name: string): string {
  const key = keyFromDirName(name);
  const status = readJson(path.join(agentsDir, name, "status.json"));
  const value = isRecord(status) ? status : {};
  const label = typeof value.label === "string" && value.label.trim() ? value.label.trim() : null;
  const cwd = typeof value.cwd === "string" ? value.cwd : null;
  const project = cwd ? path.basename(cwd) : null;
  const agent = typeof value.agent === "string" ? value.agent : null;
  const workspace = key.includes(":") ? key.slice(0, key.indexOf(":")) : null;
  const stamp = typeof value.updatedAt === "string" ? value.updatedAt
    : typeof value.finishedAt === "string" ? value.finishedAt : null;
  const seen = stamp ? `last seen ${humanAge(Date.now() - Date.parse(stamp))}` : null;
  const head = label ? `${label} (${key})` : key;
  return [head, project ? `project ${project}` : null, workspace ? `ws ${workspace}` : null, agent, seen]
    .filter(Boolean)
    .join(" · ");
}

export function checkBackendCapabilities(): CheckResult {
  const backends: DoctorBackendReport[] = allBackends().map((backend) => ({
    id: backend.id,
    available: backend.isAvailable(),
    insideSession: backend.isInsideSession(),
    workspace: backend.currentIdentity?.()?.workspace ?? null,
    panes: backend.panes,
    focusable: backend.focusable,
    canSendKeys: backend.canSendKeys,
  }));
  return {
    id: "backend-capabilities",
    label: "Backend capabilities",
    status: "ok",
    detail: backends.map((backend) => `${backend.id}: available=${backend.available}, insideSession=${backend.insideSession}, panes=${backend.panes}, focusable=${backend.focusable}, canSendKeys=${backend.canSendKeys}`).join("\\n"),
    backends,
  };
}

export function checkMalformedPresenceRecords(orchDir?: string): CheckResult {
  const agentsDir = orchDir === undefined ? presenceDir() : path.join(orchDir, "agents");
  let entries: filesystem.Dirent[];
  try {
    entries = filesystem.readdirSync(agentsDir, { withFileTypes: true });
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no presence records", ignoredRecords: [] };
    }
    throw error;
  }

  const ignoredRecords: IgnoredPresenceRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const recordPath = path.join(agentsDir, entry.name);
    const key = presenceKeyFromDirectoryName(entry.name);
    const reasons: string[] = [];
    if (!tryParseIdentity(key)) reasons.push("malformed identity key");
    let status: unknown = null;
    try { status = readJson(path.join(recordPath, "status.json")); } catch {}
    if (!isRecord(status) || status.schemaVersion !== 1) reasons.push("missing or invalid schemaVersion (expected 1)");
    if (reasons.length) ignoredRecords.push({ path: recordPath, reason: reasons.join("; ") });
  }

  return ignoredRecords.length
    ? {
        id: "malformed-presence",
        label: "Malformed presence records",
        status: "fail",
        detail: `${ignoredRecords.length} malformed/legacy presence record${ignoredRecords.length === 1 ? "" : "s"}; orch clean can reap them\\n    ${ignoredRecords.map((record) => `${record.path}: ${record.reason}`).join("\\n    ")}`,
        ignoredRecords,
      }
    : { id: "malformed-presence", label: "Malformed presence records", status: "ok", detail: "no malformed or legacy presence records", ignoredRecords };
}

async function checkStalePresence(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const agentsDir = path.join(orchDir, "agents");
  const entries = readAgentEntries(orchDir);
  if (!entries) return { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no agent dirs" };
  const stale: { name: string; description: string }[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = readJson(path.join(agentsDir, entry.name, "status.json")) as { pid?: unknown };
      if (!pidAlive(status?.pid)) stale.push({ name: entry.name, description: describePresenceDir(agentsDir, entry.name) });
    } catch {}
  }
  if (!stale.length) return { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no dead agent dirs" };
  return {
    id: "stale-presence",
    label: "Stale presence dirs",
    status: "warn",
    detail: `${stale.length} dead agent dir${stale.length === 1 ? "" : "s"} (verify before removing):\n    ${stale.map((item) => item.description).join("\n    ")}`,
    fix: {
      description: `Delete ${stale.length} dead presence dir${stale.length === 1 ? "" : "s"}: ${stale.map((item) => item.description).join("; ")}`,
      destructive: true,
      apply() {
        for (const { name } of stale) {
          filesystem.rmSync(path.join(agentsDir, name), { recursive: true, force: true });
        }
      },
    },
  };
}

interface AgentStatus {
  pid?: unknown;
  extensionHash?: unknown;
}

function isAgentStatus(value: unknown): value is AgentStatus {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Compare a bridge presence hash with the bundled bridge currently installed on disk. */
export function isBridgeExtensionStale(extensionHash: string | undefined, bundlePath = bridgeBundlePath(repoDir)): boolean {
  if (extensionHash === undefined) return false;
  try {
    return extensionHash !== computeCodeHash(bundlePath);
  } catch {
    return false;
  }
}

type JsonObject = Record<string, unknown>;
type SettingsReader = (file: string) => string;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Built hook shim inside a package root (source: scripts/claude-hooks.ts); plain ESM JS any runtime can run. */
export function claudeHookShimPath(root: string): string {
  return path.join(root, "dist", "scripts", "claude-hooks.js");
}

/**
 * Runtimes a user may run the hook shim with — whichever is on their PATH.
 * orch never requires one specific runtime; node, deno, and bun all work.
 * Order is the installer's preference when several are available.
 */
export const CLAUDE_HOOK_RUNTIMES = ["node", "deno", "bun"] as const;
export type ClaudeHookRuntime = (typeof CLAUDE_HOOK_RUNTIMES)[number];

/**
 * The exact settings.json command for one orch Claude hook event under one
 * runtime. The env gate makes non-orch sessions skip the shim without
 * spawning a runtime at all; the shim also self-gates, so this is defense in
 * depth.
 */
export function claudeHookCommand(shim: string, event: string, runtime: ClaudeHookRuntime): string {
  const run = runtime === "deno" ? "deno run --allow-all" : runtime;
  return `[ -n "$ORCH_AGENT_KEY" ] || exit 0; ${run} ${shim} ${event}`;
}

/** Verify Claude's orch hooks are installed and target this checkout's shim. */
export async function checkClaudeHooks(
  settingsPath = path.join(os.homedir(), ".claude", "settings.json"),
  readSettings: SettingsReader = (file) => filesystem.readFileSync(file, "utf8"),
): Promise<CheckResult> {
  await Promise.resolve();
  const id = "claude-hooks";
  const label = "Claude hooks shim";
  let raw: string;
  try {
    raw = readSettings(settingsPath);
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return { id, label, status: "ok", detail: "Claude is not set up (no settings.json)" };
    }
    return { id, label, status: "warn", detail: `could not read ${settingsPath}; fix: run orch setup` };
  }

  let settings: unknown;
  try {
    settings = JSON.parse(raw);
  } catch {
    return { id, label, status: "warn", detail: `malformed ${settingsPath}; fix: run orch setup` };
  }
  if (!isJsonObject(settings)) {
    return { id, label, status: "warn", detail: `malformed ${settingsPath}; fix: run orch setup` };
  }

  const hooks = settings.hooks;
  const shim = claudeHookShimPath(repoDir);
  const missing: string[] = [];
  for (const event of ["SessionStart", "Stop", "Notification"] as const) {
    // Any runtime's command form is current — the user picks node, deno, or bun.
    const expected = new Set(CLAUDE_HOOK_RUNTIMES.map((runtime) => claudeHookCommand(shim, event, runtime)));
    const entries = isJsonObject(hooks) ? hooks[event] : undefined;
    const present = Array.isArray(entries) && entries.some((entry) =>
      isJsonObject(entry) && Array.isArray(entry.hooks) && entry.hooks.some((hook) =>
        isJsonObject(hook) && hook.type === "command" && typeof hook.command === "string" && expected.has(hook.command)));
    if (!present) missing.push(event);
  }

  return missing.length
    ? { id, label, status: "warn", detail: `missing or stale orch hook${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}; fix: run orch setup` }
    : { id, label, status: "ok", detail: `all orch Claude hooks are current (${shim})` };
}

export async function checkExtensionStaleness(orchDir: string, bundlePath: string = bridgeBundlePath(repoDir)): Promise<CheckResult> {
  await Promise.resolve();
  const id = "extension-staleness";
  const label = "Extension staleness";
  const agentsDir = path.join(orchDir, "agents");
  let entries: filesystem.Dirent[] | undefined;
  try {
    entries = readAgentEntries(orchDir);
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
  if (!entries) return { id, label, status: "ok", detail: "no live agents with extension hashes" };

  let diskHash: string;
  try {
    diskHash = computeCodeHash(bundlePath);
  } catch {
    return { id, label, status: "warn", detail: "extension bundle not built; run: bun run build:ext" };
  }
  const stale: string[] = [];
  let liveWithHash = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = readJson(path.join(agentsDir, entry.name, "status.json"));
      if (!isAgentStatus(status) || !pidAlive(status.pid) || typeof status.extensionHash !== "string") continue;
      liveWithHash += 1;
      if (status.extensionHash !== diskHash) stale.push(entry.name);
    } catch {}
  }

  if (stale.length) {
    return {
      id,
      label,
      status: "warn",
      detail: `stale extension panes: ${stale.join(", ")}; hint: ${stale.map((name) => `orch reload ${name}`).join("; ")}`,
    };
  }
  if (!liveWithHash) return { id, label, status: "ok", detail: "no live agents with extension hashes" };
  return { id, label, status: "ok", detail: `all live extension hashes are current (${diskHash})` };
}

async function checkSpawnedRegistry(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const file = path.join(orchDir, "spawned.jsonl");
  let text: string;
  try {
    text = filesystem.readFileSync(file, "utf8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { id: "spawned-registry", label: "Spawn registry", status: "ok", detail: "no spawn registry" };
    throw error;
  }
  const corrupt: number[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const entry: unknown = JSON.parse(line);
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("not an object");
    } catch {
      corrupt.push(index + 1);
    }
  }
  return corrupt.length
    ? { id: "spawned-registry", label: "Spawn registry", status: "warn", detail: `corrupt JSON on line${corrupt.length === 1 ? "" : "s"} ${corrupt.join(", ")}` }
    : { id: "spawned-registry", label: "Spawn registry", status: "ok", detail: "all registry entries are valid JSON" };
}

async function checkConfig(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const file = path.join(orchDir, "config.toml");
  if (!filesystem.existsSync(file)) return { id: "config", label: "Config validity", status: "ok", detail: "no config" };
  try {
    loadConfig(orchDir);
    return { id: "config", label: "Config validity", status: "ok", detail: file };
  } catch (error: unknown) {
    return { id: "config", label: "Config validity", status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
}

function checkNotifications(_bins: BinaryStatus): CheckResult {
  if (allBackends().some((backend) => backend.isAvailable() && backend.isInsideSession())) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "native backend notification tier is available" };
  }
  if (onPath("notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "notify-send tier is available" };
  if (onPath("wsl-notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "wsl-notify-send tier is available" };
  const toast = path.join(repoDir, "scripts", "wsl-toast.ps1");
  if (onPath("powershell.exe") && filesystem.existsSync(toast)) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "powershell.exe toast tier is available" };
  }
  return { id: "notifications", label: "Desktop notifications", status: "warn", detail: "no desktop notification tier is available" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate configured notifier entries and probe each adapter in isolation. */
export async function checkNotifiers(orchDir: string): Promise<CheckResult> {
  const id = "notifiers";
  const label = "Notifiers";
  let configured: unknown[];
  try {
    configured = loadConfig(orchDir).notify;
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
  if (!configured.length) return { id, label, status: "ok", detail: "no notifiers configured" };

  const registry = createNotifierRegistry();
  const failures: string[] = [];
  for (const [index, raw] of configured.entries()) {
    const number = index + 1;
    if (!isRecord(raw)) {
      failures.push(`notifier #${number}: expected a table; fix: add [[notify]] with id = "desktop"`);
      continue;
    }
    const adapter = typeof raw.id === "string" ? raw.id : typeof raw.type === "string" ? raw.type : "";
    const config: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key !== "id" && key !== "type" && key !== "on") config[key] = value;
    }
    if (adapter === "command" && typeof config.command === "string") {
      config.command = ["sh", "-c", config.command];
    }
    const errors = registry.validate(adapter, config);
    if (errors.length) {
      failures.push(`${adapter || `notifier #${number}`}: ${errors.join(", ")}; fix: add ${errors.map((error) => {
        const field = /requires (\\w+)$/.exec(error)?.[1] ?? "the required field";
        return `${field} = \"...\"`;
      }).join(", ")} to [[notify]]`);
      continue;
    }
    const result = await registry.probe(adapter, config);
    if (!result.available) {
      let remediation = "fix: verify the adapter installation and configuration";
      if (adapter === "desktop") {
        remediation = isWslRuntime()
          ? "fix: install notify-send (`sudo apt install libnotify-bin`) or ensure powershell.exe and wslpath are reachable"
          : "fix: install notify-send (`sudo apt install libnotify-bin`)";
      } else if (adapter === "command") {
        const command = Array.isArray(config.command) && typeof config.command[0] === "string" ? config.command[0] : "the command";
        remediation = `fix: install ${command} (for example: sudo apt install ${command})`;
      }
      failures.push(`${adapter || `notifier #${number}`}: ${result.reason ?? result.error ?? "unavailable"}; ${remediation}`);
    }
  }

  return failures.length
    ? { id, label, status: "fail", detail: failures.join("; ") }
    : { id, label, status: "ok", detail: `${configured.length} configured notifier${configured.length === 1 ? "" : "s"} are available` };
}

function checkNotifySinks(orchDir: string, bins: BinaryStatus): CheckResult {
  const id = "notify-sinks";
  const label = "Notification sinks";
  const sinks = loadSinks(orchDir);
  if (!sinks.length) return { id, label, status: "ok", detail: "no notify sinks configured" };

  const desktop = checkNotifications(bins);
  const unavailable: string[] = [];
  sinks.forEach((sink: Sink, index) => {
    const name = `${sink.type} sink #${index + 1}`;
    if (sink.type === "webhook") {
      try {
        const url = new URL(String(sink.url));
        if (url.protocol !== "http:" && url.protocol !== "https:") unavailable.push(`${name} URL is not http/https`);
      } catch {
        unavailable.push(`${name} URL is not well-formed`);
      }
    } else if (sink.type === "command") {
      const command = (sink as { command?: unknown }).command;
      const binary = Array.isArray(command) && typeof command[0] === "string" ? command[0] : undefined;
      if (!binary || !onPath(binary)) unavailable.push(`${name} binary ${JSON.stringify(binary ?? "")} is not on PATH`);
    } else if (desktop.status !== "ok") {
      unavailable.push(`${name} has no available desktop notification tier`);
    }
  });

  return unavailable.length
    ? { id, label, status: "warn", detail: `undeliverable: ${unavailable.join("; ")}` }
    : { id, label, status: "ok", detail: `${sinks.length} configured sink${sinks.length === 1 ? "" : "s"} look deliverable` };
}

export async function checkExtensions(bins: BinaryStatus): Promise<CheckResult> {
  await Promise.resolve();
  if (!bins.pi) return { id: "pi-extensions", label: "pi extensions", status: "skip", detail: "pi is not installed" };
  const extensionDir = path.join(os.homedir(), ".pi", "agent", "extensions");
  const bridgeBundle = bridgeBundlePath(repoDir);
  const names = ["orchestrator-bridge.js", "herdr-agent-state.ts"];
  const stale: string[] = [];
  const fixable: string[] = [];
  let extensionDirMissing = false;
  const addStale = (name: string): void => {
    if (!stale.includes(name)) stale.push(name);
  };
  const addFixable = (name: string): void => {
    if (!fixable.includes(name)) fixable.push(name);
  };

  let bundleMissing = false;
  try {
    bundleMissing = !filesystem.statSync(bridgeBundle).isFile();
  } catch {
    bundleMissing = true;
  }

  try {
    if (!filesystem.lstatSync(extensionDir).isDirectory()) extensionDirMissing = false;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") extensionDirMissing = true;
  }
  for (const name of names) {
    const destination = path.join(extensionDir, name);
    if (name === "orchestrator-bridge.js" && bundleMissing) {
      addStale(name);
      addFixable(name);
      continue;
    }
    const source = name === "orchestrator-bridge.js"
      ? bridgeBundle
      : path.join(repoDir, "extensions", name);
    let sourcePath: string;
    try {
      sourcePath = filesystem.realpathSync(source);
    } catch {
      addStale(name);
      if (name === "orchestrator-bridge.js") addFixable(name);
      continue;
    }
    try {
      const destinationStat = filesystem.lstatSync(destination);
      if (destinationStat.isSymbolicLink()) {
        if (filesystem.realpathSync(destination) !== sourcePath) {
          addStale(name);
          addFixable(name);
        }
      } else if (computeCodeHash(destination) !== computeCodeHash(source)) {
        addStale(name);
        addFixable(name);
      }
    } catch (error: unknown) {
      addStale(name);
      if ((error as NodeJS.ErrnoException).code === "ENOENT") addFixable(name);
    }
  }
  const applyExtensionFix = (): void => {
    if (fixable.includes("orchestrator-bridge.js")) {
      buildBridgeBundle(repoDir);
    }
    filesystem.mkdirSync(extensionDir, { recursive: true });
    for (const name of fixable) {
      const destination = path.join(extensionDir, name);
      const source = name === "orchestrator-bridge.js"
        ? bridgeBundle
        : path.join(repoDir, "extensions", name);
      filesystem.rmSync(destination, { recursive: true, force: true });
      filesystem.symlinkSync(source, destination);
    }
  };

  if (bundleMissing) {
    const result: CheckResult = {
      id: "pi-extensions",
      label: "pi extensions",
      status: "warn",
      detail: "extension bundle not built; run: bun run build:ext",
    };
    if (fixable.length) {
      result.fix = {
        description: extensionDirMissing
          ? `Build bundled bridge, create missing extension dir, and redeploy: ${fixable.join(", ")}`
          : `Build bundled bridge and redeploy: ${fixable.join(", ")}`,
        apply: applyExtensionFix,
      };
    }
    return result;
  }
  if (!stale.length) return { id: "pi-extensions", label: "pi extensions", status: "ok", detail: "bundled orchestrator-bridge and herdr-agent-state are current" };
  const result: CheckResult = {
    id: "pi-extensions",
    label: "pi extensions",
    status: "fail",
    detail: `missing or stale: ${stale.join(", ")}`,
  };
  if (fixable.length) {
    result.fix = {
      description: extensionDirMissing
        ? `Build bundled bridge, create missing extension dir, and redeploy: ${fixable.join(", ")}`
        : `Build bundled bridge and redeploy: ${fixable.join(", ")}`,
      apply: applyExtensionFix,
    };
  }
  return result;
}

function isWslRuntime(): boolean {
  if (process.env.WSL_DISTRO_NAME) return true;
  return /microsoft|wsl/i.test(os.release());
}

export function isDrvFsPath(resolved: string): boolean {
  return resolved.toLowerCase().startsWith("/mnt/");
}

async function checkOrchDirLocation(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const id = "orchdir-location";
  const label = "ORCH_DIR location";
  let resolved: string;
  try {
    resolved = filesystem.realpathSync(orchDir);
  } catch {
    resolved = path.resolve(orchDir);
  }
  if (!isWslRuntime() || !isDrvFsPath(resolved)) {
    return { id, label, status: "ok", detail: "ORCH_DIR is on the Linux filesystem" };
  }
  return {
    id,
    label,
    status: "warn",
    detail: `ORCH_DIR resolves to ${resolved}; move $ORCH_DIR onto the Linux filesystem (e.g. under $HOME) because SQLite WAL on DrvFs (/mnt) is slow and unsafe`,
  };
}

const defaultDaemonEntrypoint = path.join(repoDir, "dist", "daemon", "orchd.js");

function daemonEntrypoint(): string {
  return process.env.ORCHD_ENTRYPOINT ?? defaultDaemonEntrypoint;
}

async function checkDaemonPresence(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lockFile = path.join(orchDir, "orchd.lock");
  if (!filesystem.existsSync(lockFile)) {
    return { id: "orchd", label: "orchd presence", status: "ok", detail: "orchd is absent (daemon is optional)" };
  }
  const lock = readDaemonLock(orchDir);
  if (!lock) {
    return { id: "orchd", label: "orchd presence", status: "warn", detail: "orchd lock is present but invalid" };
  }
  return pidAlive(lock.pid)
    ? { id: "orchd", label: "orchd presence", status: "ok", detail: `orchd is running (pid ${lock.pid})` }
    : { id: "orchd", label: "orchd presence", status: "warn", detail: `orchd is stale (lock for dead pid ${lock.pid}); run orch daemon start` };
}

async function checkDaemonStaleness(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lock = readDaemonLock(orchDir);
  if (!lock || !pidAlive(lock.pid)) {
    return { id: "orchd-staleness", label: "orchd code", status: "skip", detail: "orchd is not running" };
  }
  const diskHash = computeCodeHash(daemonEntrypoint());
  if (lock.codeHash !== diskHash) {
    return {
      id: "orchd-staleness",
      label: "orchd code",
      status: "warn",
      detail: `orchd code is stale (lock ${lock.codeHash}, disk ${diskHash}); run orch daemon reload`,
    };
  }
  return { id: "orchd-staleness", label: "orchd code", status: "ok", detail: `orchd code is current (${diskHash})` };
}

async function checkDaemonLock(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const lockFile = path.join(orchDir, "orchd.lock");
  if (!filesystem.existsSync(lockFile)) {
    return { id: "orchd-lock", label: "orchd lock", status: "ok", detail: "no orchd lock" };
  }
  const lock = readDaemonLock(orchDir);
  if (!lock) {
    return { id: "orchd-lock", label: "orchd lock", status: "fail", detail: `invalid orchd lock: ${lockFile}` };
  }
  if (pidAlive(lock.pid)) {
    return { id: "orchd-lock", label: "orchd lock", status: "ok", detail: `lock belongs to live pid ${lock.pid}` };
  }
  return {
    id: "orchd-lock",
    label: "orchd lock",
    status: "fail",
    detail: `stale orchd lock ${lockFile} (dead pid ${lock.pid})`,
    fix: {
      description: `Remove stale orchd lock ${lockFile} (dead pid ${lock.pid})`,
      apply() {
        filesystem.rmSync(lockFile, { force: true });
      },
    },
  };
}

async function checkDaemonSocket(orchDir: string): Promise<CheckResult> {
  const lock = readDaemonLock(orchDir);
  if (!lock || !pidAlive(lock.pid)) {
    return { id: "orchd-socket", label: "orchd socket", status: "skip", detail: "no running orchd to probe" };
  }
  try {
    await rpcCall(orchDir, "daemon-status", undefined, 250);
    return { id: "orchd-socket", label: "orchd socket", status: "ok", detail: `daemon-status answered (pid ${lock.pid})` };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      id: "orchd-socket",
      label: "orchd socket",
      status: "fail",
      detail: `orchd pid ${lock.pid} is not answerable: ${reason}; try orch daemon start`,
    };
  }
}

type SshRunner = (destination: string, command: string, options?: { timeoutMs?: number }) => SshResult;

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function configuredHosts(orchDir: string): [string, HostConfig][] {
  return Object.entries(loadConfig(orchDir).hosts);
}

function hostDestination(name: string, host: HostConfig): string {
  const destination = host.dest ?? host.ssh;
  if (!destination) throw new Error(`Host "${name}" has no SSH destination`);
  return destination;
}

function hostResult(id: string, label: string, failures: string[], total: number, failureStatus: "warn" | "fail"): CheckResult {
  if (!total) return { id, label, status: "ok", detail: "no remote hosts configured" };
  if (!failures.length) return { id, label, status: "ok", detail: `${total} configured host${total === 1 ? "" : "s"} passed` };
  return { id, label, status: failureStatus, detail: failures.join("; ") };
}

async function checkRemoteReachability(orchDir: string, runner: SshRunner = runSSH): Promise<CheckResult> {
  await Promise.resolve();
  const hosts = configuredHosts(orchDir);
  const failures: string[] = [];
  for (const [name, host] of hosts) {
    try {
      const destination = hostDestination(name, host);
      const result = runner(destination, "true", { timeoutMs: 5000 });
      if (!result.ok) failures.push(`${name}: SSH unreachable (${result.stderr || "connection failed"}); fix: ssh -o BatchMode=yes -o ConnectTimeout=5 ${destination} true`);
    } catch (error) { failures.push(`${name}: SSH probe failed (${String(error)}); fix: ssh -o BatchMode=yes -o ConnectTimeout=5 ${host.dest ?? host.ssh ?? name} true`); }
  }
  return hostResult("remote-ssh", "Remote SSH reachability", failures, hosts.length, "fail");
}

async function checkRemoteVersion(orchDir: string, runner: SshRunner = runSSH): Promise<CheckResult> {
  await Promise.resolve();
  const hosts = configuredHosts(orchDir);
  const failures: string[] = [];
  const local = (readJson(path.join(repoDir, "package.json")) as { version?: string }).version ?? "unknown";
  for (const [name, host] of hosts) {
    const destination = hostDestination(name, host);
    const result = runner(destination, "orch --version", { timeoutMs: host.timeout_ms });
    const remote = /\b\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/.exec(result.stdout)?.[0];
    if (!result.ok || !remote || remote !== local) failures.push(`${name}: remote orch ${remote ?? "is not installed"} (local ${local}); fix: ssh ${destination} orch --version`);
  }
  return hostResult("remote-orch-version", "Remote orch version/schema", failures, hosts.length, "fail");
}

async function checkRemoteOrchDir(orchDir: string, runner: SshRunner = runSSH): Promise<CheckResult> {
  await Promise.resolve();
  const hosts = configuredHosts(orchDir);
  const failures: string[] = [];
  for (const [name, host] of hosts) {
    const destination = hostDestination(name, host);
    const remoteDir = host.orch_dir ?? "${HOME}/.orch";
    const command = host.orch_dir
      ? `test -d ${shellQuote(remoteDir)} && test -w ${shellQuote(remoteDir)}`
      : 'test -d "${ORCH_DIR:-$HOME/.orch}" && test -w "${ORCH_DIR:-$HOME/.orch}"';
    const result = runner(destination, command, { timeoutMs: host.timeout_ms });
    if (!result.ok) {
      const fixDir = host.orch_dir ? shellQuote(host.orch_dir) : '"${ORCH_DIR:-$HOME/.orch}"';
      failures.push(`${name}: ORCH_DIR ${remoteDir} is missing or not writable; fix: ssh ${destination} 'mkdir -p ${fixDir} && test -w ${fixDir}'`);
    }
  }
  return hostResult("remote-orch-dir", "Remote ORCH_DIR", failures, hosts.length, "warn");
}

async function checkWorktreeGitignore(): Promise<CheckResult> {
  const worktrees = path.join(process.cwd(), ".orch-worktrees");
  if (!filesystem.existsSync(worktrees)) return { id: "worktree-gitignore", label: "Worktree gitignore", status: "skip", detail: ".orch-worktrees does not exist" };
  const result = await commandOutput("git", ["check-ignore", "-q", ".orch-worktrees"]);
  return result.ok
    ? { id: "worktree-gitignore", label: "Worktree gitignore", status: "ok", detail: ".orch-worktrees is gitignored" }
    : {
        id: "worktree-gitignore",
        label: "Worktree gitignore",
        status: "warn",
        detail: ".orch-worktrees is not gitignored; fix: printf '\n.orch-worktrees/\n' >> .gitignore",
      };
}

async function isolated(id: string, label: string, check: () => Promise<CheckResult> | CheckResult): Promise<CheckResult> {
  try {
    return await check();
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
}

/** Run independent environment diagnostics; individual check failures never reject this function. */
export async function runDoctor(orchDir: string, sshRunner: SshRunner = runSSH): Promise<CheckResult[]> {
  const bins = binaryStatus();
  return Promise.all([
    isolated("bins", "Required binaries", () => checkBins(bins)),
    isolated("backend-capabilities", "Backend capabilities", checkBackendCapabilities),
    isolated("malformed-presence", "Malformed presence records", () => checkMalformedPresenceRecords(orchDir)),
    isolated("stale-presence", "Stale presence dirs", () => checkStalePresence(orchDir)),
    isolated("extension-staleness", "Extension staleness", () => checkExtensionStaleness(orchDir)),
    isolated("claude-hooks", "Claude hooks shim", () => checkClaudeHooks()),
    isolated("spawned-registry", "Spawn registry", () => checkSpawnedRegistry(orchDir)),
    isolated("config", "Config validity", () => checkConfig(orchDir)),
    isolated("notifications", "Desktop notifications", () => checkNotifications(bins)),
    isolated("notify-sinks", "Notification sinks", () => checkNotifySinks(orchDir, bins)),
    isolated("notifiers", "Notifiers", () => checkNotifiers(orchDir)),
    isolated("pi-extensions", "pi extensions", () => checkExtensions(bins)),
    isolated("orchdir-location", "ORCH_DIR location", () => checkOrchDirLocation(orchDir)),
    isolated("orchd", "orchd presence", () => checkDaemonPresence(orchDir)),
    isolated("orchd-staleness", "orchd code", () => checkDaemonStaleness(orchDir)),
    isolated("orchd-lock", "orchd lock", () => checkDaemonLock(orchDir)),
    isolated("orchd-socket", "orchd socket", () => checkDaemonSocket(orchDir)),
    isolated("remote-ssh", "Remote SSH reachability", () => checkRemoteReachability(orchDir, sshRunner)),
    isolated("remote-orch-version", "Remote orch version/schema", () => checkRemoteVersion(orchDir, sshRunner)),
    isolated("remote-orch-dir", "Remote ORCH_DIR", () => checkRemoteOrchDir(orchDir, sshRunner)),
    isolated("worktree-gitignore", "Worktree gitignore", checkWorktreeGitignore),
  ]);
}

export function applyFixes(results: CheckResult[]): { applied: string[] } {
  const applied: string[] = [];
  for (const result of results) {
    if (!result.fix) continue;
    result.fix.apply();
    applied.push(result.fix.description);
  }
  return { applied };
}
