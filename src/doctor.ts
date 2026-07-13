import * as filesystem from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";

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

async function checkStalePresence(orchDir: string): Promise<CheckResult> {
  const agentsDir = path.join(orchDir, "agents");
  let entries: filesystem.Dirent[];
  try {
    entries = filesystem.readdirSync(agentsDir, { withFileTypes: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no agent dirs" };
    throw error;
  }
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

async function checkWorktreeGitignore(): Promise<CheckResult> {
  const worktrees = path.join(process.cwd(), ".orch-worktrees");
  if (!filesystem.existsSync(worktrees)) return { id: "worktree-gitignore", label: "Worktree gitignore", status: "skip", detail: ".orch-worktrees does not exist" };
  const result = await commandOutput("git", ["check-ignore", "-q", ".orch-worktrees"]);
  return result.ok
    ? { id: "worktree-gitignore", label: "Worktree gitignore", status: "ok", detail: ".orch-worktrees is gitignored" }
    : { id: "worktree-gitignore", label: "Worktree gitignore", status: "warn", detail: ".orch-worktrees is not gitignored" };
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
    isolated("spawned-registry", "Spawn registry", () => checkSpawnedRegistry(orchDir)),
    isolated("config", "Config validity", () => checkConfig(orchDir)),
    isolated("notifications", "Desktop notifications", () => checkNotifications(bins)),
    isolated("pi-extensions", "pi extensions", () => checkExtensions(bins)),
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
