import * as filesystem from "node:fs";
import { execFile } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { loadConfig, settingsPath, type HostConfig } from "./config.ts";
import { createNotifierRegistry, loadSinks, type Sink } from "./notify.ts";
import { computeCodeHash, readDaemonLock } from "./daemon/lifecycle.ts";
import { rpcCall } from "./daemon/rpc.ts";
import { runSSH, type SshResult } from "./remote.ts";
import { extensionBundlePath } from "./bridge-bundle.ts";
import { allBackends, getBackend } from "./backends/registry.ts";
import { tryParseIdentity } from "./backends/identity.ts";
import { presenceDir, presenceKeyFromDirectoryName } from "./store.ts";
import { resolveAdapter } from "./adapters/registry.ts";
import { PRESENCE_SCHEMA } from "./presence-schema.ts";
import { packageRoot } from "./util.ts";
import type { CheckResult, DoctorBackendReport, IgnoredPresenceRecord } from "./doctor-types.ts";
export type { CheckResult } from "./doctor-types.ts";

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

export function binaryStatus(ids: readonly string[]): BinaryStatus {
  return Object.fromEntries(ids.map((id) => [id, onPath(id)]));
}

function checkBins(bins: BinaryStatus, ids: readonly string[]): CheckResult {
  const missing = ids.filter((id) => !bins[id]);
  if (!missing.length) return { id: "bins", label: "Required binaries", status: "ok", detail: ids.length ? `${ids.join(" and ")} ${ids.length === 1 ? "is" : "are"} on PATH` : "no adapters installed" };
  return {
    id: "bins",
    label: "Required binaries",
    status: "fail",
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

export function checkBackendCapabilities(ids: readonly string[] = allBackends().map((backend) => backend.id)): CheckResult {
  const selected = new Set(ids);
  const backends: DoctorBackendReport[] = allBackends().filter((backend) => selected.has(backend.id)).map((backend) => ({
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
    status: backends.some((backend) => !backend.available || !backend.insideSession) ? "fail" : "ok",
    detail: backends.map((backend) => `${backend.id}: available=${backend.available}, insideSession=${backend.insideSession}, panes=${backend.panes}, focusable=${backend.focusable}, canSendKeys=${backend.canSendKeys}`).join("\\n") || "no installed backends",

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
    if (!isRecord(status) || status.schema !== PRESENCE_SCHEMA)
      reasons.push(`missing or invalid schema (expected ${PRESENCE_SCHEMA})`);
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
export function isBridgeExtensionStale(extensionHash: string | undefined, bundlePath = extensionBundlePath(repoDir, "orchestrator-bridge")): boolean {
  if (extensionHash === undefined) return false;
  try {
    return extensionHash !== computeCodeHash(bundlePath);
  } catch {
    return false;
  }
}

/** Verify Claude's orch hooks are installed and target this checkout's shim. */
export async function checkExtensionStaleness(orchDir: string, bundlePath: string = extensionBundlePath(repoDir, "orchestrator-bridge")): Promise<CheckResult> {
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

async function checkSpawnLimits(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const limits = loadConfig(orchDir).limits;
  const globalCap = limits.maxAgents;
  const violations = globalCap === undefined
    ? []
    : Object.entries(limits.workspaces ?? {}).filter(([, cap]) => cap > globalCap);
  if (!violations.length) return { id: "spawn-limits", label: "Spawn limits", status: "ok", detail: "spawn limits are satisfiable" };
  return {
    id: "spawn-limits",
    label: "Spawn limits",
    status: "warn",
    detail: violations.map(([workspace, cap]) => `limits.workspaces.${workspace} (${cap}) exceeds limits.maxAgents (${globalCap})`).join("; "),
  };
}

async function checkCommandLocks(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const config = loadConfig(orchDir);
  if (config.locked_commands.length === 0) return { id: "command-locks", label: "Command locks", status: "skip", detail: "no locked_commands configured" };
  const unenforced = config.installed.adapters.filter((id) => !resolveAdapter(id).caps.enforcesCommandLocks);
  if (unenforced.length === 0) return { id: "command-locks", label: "Command locks", status: "ok", detail: `${config.locked_commands.length} locked command(s); every installed adapter enforces them` };
  return {
    id: "command-locks",
    label: "Command locks",
    status: "warn",
    detail: `locked_commands set but ${unenforced.join(", ")} cannot enforce them (no pre-tool seam) — those agents get the worker-prompt clause only; the pi fleet is hard-enforced`,
  };
}

async function checkConfig(orchDir: string): Promise<CheckResult> {
  await Promise.resolve();
  const file = settingsPath(orchDir);
  if (!filesystem.existsSync(file)) return { id: "config", label: "Config validity", status: "ok", detail: "no settings.json" };
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
  if (!host.dest) throw new Error(`Host "${name}" has no SSH destination`);
  return host.dest;
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
    } catch (error) { failures.push(`${name}: SSH probe failed (${String(error)}); fix: ssh -o BatchMode=yes -o ConnectTimeout=5 ${host.dest || name} true`); }
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

/** Validate every distinct live adapter/backend composition independently. */
async function checkLiveFleetPairs(orchDir: string): Promise<CheckResult[]> {
  const pairs = new Set<string>();
  const agentsDir = path.join(orchDir, "agents");
  let entries: filesystem.Dirent[] = [];
  try { entries = filesystem.readdirSync(agentsDir, { withFileTypes: true }); } catch {}
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const status = readJson(path.join(agentsDir, entry.name, "status.json"));
    if (!isRecord(status) || !pidAlive(status.pid)) continue;
    const adapter = typeof status.agent === "string" ? status.agent : undefined;
    const backend = typeof status.backend === "string" ? status.backend : undefined;
    if (adapter && backend) pairs.add(`${adapter}\u0000${backend}`);
  }
  return Promise.all([...pairs].map(async (encoded) => {
    const [adapterId, backendId] = encoded.split("\u0000");
    const id = `fleet-pair-${adapterId}-${backendId}`;
    try {
      const adapter = resolveAdapter(adapterId!);
      const backend = getBackend(backendId!);
      if (!backend) return { id, label: `${adapterId} + ${backendId} live pair`, status: "fail", detail: `unknown backend ${JSON.stringify(backendId)}` };
      const diagnosis = adapter.diagnoseShim ? await adapter.diagnoseShim() : { id: `shim-${adapterId}`, label: `${adapterId} integration`, status: "skip" as const, detail: `${adapterId} declares no integration shim` };
      return { ...diagnosis, id, label: `${adapterId} + ${backendId} live pair`, detail: `${adapterId}/${backendId}: ${diagnosis.detail}` };
    } catch (error: unknown) {
      return { id, label: `${adapterId} + ${backendId} live pair`, status: "fail" as const, detail: error instanceof Error ? error.message : String(error) };
    }
  }));
}

/** Run independent environment diagnostics; individual check failures never reject this function. */
export async function runDoctor(orchDir: string, sshRunner: SshRunner = runSSH): Promise<CheckResult[]> {
  // Read settings only to derive provider checks. checkConfig owns the user-facing
  // failure result, so a malformed file cannot prevent neutral checks from running.
  let installedAdapters: string[] = [];
  let installedBackends: string[] = [];
  try {
    const config = loadConfig(orchDir);
    installedAdapters = config.installed.adapters;
    installedBackends = config.installed.backends;
  } catch {}
  const bins = binaryStatus(installedAdapters);
  const providerChecks = installedAdapters.map((id) => [
    isolated(`bin-${id}`, `${id} binary`, () => bins[id]
      ? { id: `bin-${id}`, label: `${id} binary`, status: "ok", detail: `${id} is on PATH` }
      : { id: `bin-${id}`, label: `${id} binary`, status: "fail", detail: `${id} is not on PATH` }),
    isolated(`shim-${id}`, `${id} integration`, async () => {
      const adapter = resolveAdapter(id);
      return adapter.diagnoseShim ? await adapter.diagnoseShim() : { id: `shim-${id}`, label: `${id} integration`, status: "skip", detail: `${id} declares no integration shim` };
    }),
  ]).flat();
  const livePairs = await checkLiveFleetPairs(orchDir);
  return Promise.all([
    isolated("bins", "Required binaries", () => checkBins(bins, installedAdapters)),
    ...providerChecks,
    ...livePairs.map((pair) => Promise.resolve(pair)),
    isolated("backend-capabilities", "Backend capabilities", () => checkBackendCapabilities(installedBackends)),
    isolated("malformed-presence", "Malformed presence records", () => checkMalformedPresenceRecords(orchDir)),
    isolated("stale-presence", "Stale presence dirs", () => checkStalePresence(orchDir)),
    isolated("extension-staleness", "Extension staleness", () => checkExtensionStaleness(orchDir)),
    isolated("spawned-registry", "Spawn registry", () => checkSpawnedRegistry(orchDir)),
    isolated("config", "Config validity", () => checkConfig(orchDir)),
    isolated("spawn-limits", "Spawn limits", () => checkSpawnLimits(orchDir)),
    isolated("notifications", "Desktop notifications", () => checkNotifications(bins)),
    isolated("notify-sinks", "Notification sinks", () => checkNotifySinks(orchDir, bins)),
    isolated("notifiers", "Notifiers", () => checkNotifiers(orchDir)),
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
