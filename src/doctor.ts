import * as filesystem from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";
import { computeCodeHash, readDaemonLock } from "./daemon/lifecycle.ts";
import { rpcCall } from "./daemon/rpc.ts";

export type FixDescriptor = {
  description: string;
  apply(): void;
};

export type CheckResult = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "skip";
  detail: string;
  fix?: FixDescriptor;
};

type BinaryStatus = Record<string, boolean>;

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function onPath(command: string): boolean {
  const extensions = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
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

async function commandOutput(command: string, args: string[]): Promise<{ ok: boolean; output: string }> {
  try {
    const process = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited,
    ]);
    return { ok: code === 0, output: (stdout || stderr).trim() };
  } catch (error: unknown) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

async function checkBins(bins: BinaryStatus): Promise<CheckResult> {
  const missing = ["bun", "herdr", "pi"].filter((bin) => !bins[bin]);
  if (!missing.length) return { id: "bins", label: "Required binaries", status: "ok", detail: "bun, herdr, and pi are on PATH" };
  if (!bins.bun) return { id: "bins", label: "Required binaries", status: "fail", detail: "bun is not on PATH" };
  return {
    id: "bins",
    label: "Required binaries",
    status: "warn",
    detail: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not on PATH${!bins.herdr ? " (herdr is optional)" : ""}`,
  };
}

async function checkHerdrVersion(bins: BinaryStatus): Promise<CheckResult> {
  if (!bins.herdr) return { id: "herdr-version", label: "herdr version", status: "skip", detail: "herdr is not installed" };
  const result = await commandOutput("herdr", ["--version"]);
  const version = result.output.match(/\b\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/)?.[0];
  if (!result.ok || !version) {
    return { id: "herdr-version", label: "herdr version", status: "warn", detail: "could not parse herdr --version output" };
  }
  return { id: "herdr-version", label: "herdr version", status: "ok", detail: `herdr ${version}` };
}

function readAgentEntries(orchDir: string): filesystem.Dirent[] | undefined {
  try {
    return filesystem.readdirSync(path.join(orchDir, "agents"), { withFileTypes: true });
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

async function checkStalePresence(orchDir: string): Promise<CheckResult> {
  const agentsDir = path.join(orchDir, "agents");
  const entries = readAgentEntries(orchDir);
  if (!entries) return { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no agent dirs" };
  const stale: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = readJson(path.join(agentsDir, entry.name, "status.json")) as { pid?: unknown };
      if (!pidAlive(status?.pid)) stale.push(entry.name);
    } catch {}
  }
  return stale.length
    ? {
        id: "stale-presence",
        label: "Stale presence dirs",
        status: "warn",
        detail: `dead pid: ${stale.join(", ")}`,
        fix: {
          description: `Remove stale presence dirs: ${stale.join(", ")}`,
          apply() {
            for (const name of stale) {
              filesystem.rmSync(path.join(agentsDir, name), { recursive: true, force: true });
            }
          },
        },
      }
    : { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no dead agent dirs" };
}

type AgentStatus = {
  pid?: unknown;
  extensionHash?: unknown;
};

function isAgentStatus(value: unknown): value is AgentStatus {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Compare a bridge presence hash with the bridge currently installed on disk. */
export function isBridgeExtensionStale(extensionHash: string | undefined): boolean {
  if (extensionHash === undefined) return false;
  return extensionHash !== computeCodeHash(path.join(repoDir, "extensions", "orchestrator-bridge.ts"));
}

async function checkExtensionStaleness(orchDir: string): Promise<CheckResult> {
  const id = "extension-staleness";
  const label = "Extension staleness";
  const agentsDir = path.join(orchDir, "agents");
  const entries = readAgentEntries(orchDir);
  if (!entries) return { id, label, status: "ok", detail: "no live agents with extension hashes" };

  const diskHash = computeCodeHash(path.join(repoDir, "extensions", "orchestrator-bridge.ts"));
  const stale: string[] = [];
  let liveWithHash = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const status = readJson(path.join(agentsDir, entry.name, "status.json"));
      if (!isAgentStatus(status) || !pidAlive(status.pid) || typeof status.extensionHash !== "string") continue;
      liveWithHash += 1;
      if (isBridgeExtensionStale(status.extensionHash)) stale.push(entry.name);
    } catch {}
  }

  if (stale.length) {
    return {
      id,
      label,
      status: "warn",
      detail: `stale extension panes: ${stale.join(", ")}; hint: ${stale.map((name) => `orch restart ${name}`).join("; ")}`,
    };
  }
  if (!liveWithHash) return { id, label, status: "ok", detail: "no live agents with extension hashes" };
  return { id, label, status: "ok", detail: `all live extension hashes are current (${diskHash})` };
}

async function checkSpawnedRegistry(orchDir: string): Promise<CheckResult> {
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
      const entry = JSON.parse(line);
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
  const file = path.join(orchDir, "config.toml");
  if (!filesystem.existsSync(file)) return { id: "config", label: "Config validity", status: "ok", detail: "no config" };
  try {
    loadConfig(orchDir);
    return { id: "config", label: "Config validity", status: "ok", detail: file };
  } catch (error: unknown) {
    return { id: "config", label: "Config validity", status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
}

async function checkNotifications(bins: BinaryStatus): Promise<CheckResult> {
  if (process.env.HERDR_ENV === "1" && bins.herdr) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "herdr notification tier is available" };
  }
  if (onPath("notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "notify-send tier is available" };
  if (onPath("wsl-notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "wsl-notify-send tier is available" };
  const toast = path.join(repoDir, "scripts", "wsl-toast.ps1");
  if (onPath("powershell.exe") && filesystem.existsSync(toast)) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "powershell.exe toast tier is available" };
  }
  return { id: "notifications", label: "Desktop notifications", status: "warn", detail: "no desktop notification tier is available" };
}

async function checkExtensions(bins: BinaryStatus): Promise<CheckResult> {
  if (!bins.pi) return { id: "pi-extensions", label: "pi extensions", status: "skip", detail: "pi is not installed" };
  const extensionDir = path.join(os.homedir(), ".pi", "agent", "extensions");
  const names = ["orchestrator-bridge.ts", "herdr-agent-state.ts"];
  const stale: string[] = [];
  const fixable: string[] = [];
  let extensionDirMissing = false;
  try {
    if (!filesystem.lstatSync(extensionDir).isDirectory()) extensionDirMissing = false;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") extensionDirMissing = true;
  }
  for (const name of names) {
    const destination = path.join(extensionDir, name);
    const source = path.join(repoDir, "extensions", name);
    let sourcePath: string;
    try {
      sourcePath = filesystem.realpathSync(source);
    } catch {
      stale.push(name);
      continue;
    }
    try {
      const destinationStat = filesystem.lstatSync(destination);
      if (!destinationStat.isSymbolicLink()) {
        stale.push(name);
        continue;
      }
      if (filesystem.realpathSync(destination) !== sourcePath) {
        stale.push(name);
        fixable.push(name);
      }
    } catch (error: unknown) {
      stale.push(name);
      if ((error as NodeJS.ErrnoException).code === "ENOENT") fixable.push(name);
    }
  }
  if (!stale.length) return { id: "pi-extensions", label: "pi extensions", status: "ok", detail: "orchestrator-bridge and herdr-agent-state are current" };
  const result: CheckResult = {
    id: "pi-extensions",
    label: "pi extensions",
    status: "fail",
    detail: `missing or stale: ${stale.join(", ")}`,
  };
  if (fixable.length) {
    result.fix = {
      description: extensionDirMissing
        ? `Create missing extension dir and recreate pi extension symlinks: ${fixable.join(", ")}`
        : `Recreate pi extension symlinks: ${fixable.join(", ")}`,
      apply() {
        filesystem.mkdirSync(extensionDir, { recursive: true });
        for (const name of fixable) {
          const destination = path.join(extensionDir, name);
          const source = path.join(repoDir, "extensions", name);
          filesystem.rmSync(destination, { recursive: true, force: true });
          filesystem.symlinkSync(source, destination);
        }
      },
    };
  }
  return result;
}

const defaultDaemonEntrypoint = path.join(repoDir, "src", "daemon", "orchd.ts");

function daemonEntrypoint(): string {
  return process.env.ORCHD_ENTRYPOINT ?? defaultDaemonEntrypoint;
}

async function checkDaemonPresence(orchDir: string): Promise<CheckResult> {
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
    : { id: "orchd", label: "orchd presence", status: "warn", detail: `orchd is absent (stale lock for dead pid ${lock.pid})` };
}

async function checkDaemonStaleness(orchDir: string): Promise<CheckResult> {
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

async function isolated(id: string, label: string, check: () => Promise<CheckResult>): Promise<CheckResult> {
  try {
    return await check();
  } catch (error: unknown) {
    return { id, label, status: "fail", detail: error instanceof Error ? error.message : String(error) };
  }
}

/** Run independent environment diagnostics; individual check failures never reject this function. */
export async function runDoctor(orchDir: string): Promise<CheckResult[]> {
  const bins: BinaryStatus = { bun: onPath("bun"), herdr: onPath("herdr"), pi: onPath("pi") };
  return Promise.all([
    isolated("bins", "Required binaries", () => checkBins(bins)),
    isolated("herdr-version", "herdr version", () => checkHerdrVersion(bins)),
    isolated("stale-presence", "Stale presence dirs", () => checkStalePresence(orchDir)),
    isolated("extension-staleness", "Extension staleness", () => checkExtensionStaleness(orchDir)),
    isolated("spawned-registry", "Spawn registry", () => checkSpawnedRegistry(orchDir)),
    isolated("config", "Config validity", () => checkConfig(orchDir)),
    isolated("notifications", "Desktop notifications", () => checkNotifications(bins)),
    isolated("pi-extensions", "pi extensions", () => checkExtensions(bins)),
    isolated("orchd", "orchd presence", () => checkDaemonPresence(orchDir)),
    isolated("orchd-staleness", "orchd code", () => checkDaemonStaleness(orchDir)),
    isolated("orchd-lock", "orchd lock", () => checkDaemonLock(orchDir)),
    isolated("orchd-socket", "orchd socket", () => checkDaemonSocket(orchDir)),
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
