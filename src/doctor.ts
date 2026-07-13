import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";

export type CheckResult = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "skip";
  detail: string;
  fix?: string;
};

type BinaryStatus = Record<string, boolean>;

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function onPath(command: string): boolean {
  const extensions = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
    for (const extension of extensions) {
      try {
        fs.accessSync(path.join(directory, command + extension), fs.constants.X_OK);
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
  return JSON.parse(fs.readFileSync(file, "utf8"));
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
  if (!bins.bun) return { id: "bins", label: "Required binaries", status: "fail", detail: "bun is not on PATH", fix: "curl -fsSL https://bun.sh/install | bash" };
  return {
    id: "bins",
    label: "Required binaries",
    status: "warn",
    detail: `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not on PATH${!bins.herdr ? " (herdr is optional)" : ""}`,
    fix: !bins.pi ? "bun add -g @earendil-works/pi-coding-agent" : "curl -fsSL https://herdr.dev/install.sh | bash",
  };
}

async function checkHerdrVersion(bins: BinaryStatus): Promise<CheckResult> {
  if (!bins.herdr) return { id: "herdr-version", label: "herdr version", status: "skip", detail: "herdr is not installed" };
  const result = await commandOutput("herdr", ["--version"]);
  const version = result.output.match(/\b\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/)?.[0];
  if (!result.ok || !version) {
    return { id: "herdr-version", label: "herdr version", status: "warn", detail: "could not parse herdr --version output", fix: "herdr --version" };
  }
  return { id: "herdr-version", label: "herdr version", status: "ok", detail: `herdr ${version}` };
}

async function checkStalePresence(orchDir: string): Promise<CheckResult> {
  const agentsDir = path.join(orchDir, "agents");
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true });
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
    ? { id: "stale-presence", label: "Stale presence dirs", status: "warn", detail: `dead pid: ${stale.join(", ")}`, fix: "orch clean" }
    : { id: "stale-presence", label: "Stale presence dirs", status: "ok", detail: "no dead agent dirs" };
}

async function checkSpawnedRegistry(orchDir: string): Promise<CheckResult> {
  const file = path.join(orchDir, "spawned.jsonl");
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
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
    ? { id: "spawned-registry", label: "Spawn registry", status: "warn", detail: `corrupt JSON on line${corrupt.length === 1 ? "" : "s"} ${corrupt.join(", ")}`, fix: "Remove or repair the corrupt spawned.jsonl lines" }
    : { id: "spawned-registry", label: "Spawn registry", status: "ok", detail: "all registry entries are valid JSON" };
}

async function checkConfig(orchDir: string): Promise<CheckResult> {
  const file = path.join(orchDir, "config.toml");
  if (!fs.existsSync(file)) return { id: "config", label: "Config validity", status: "ok", detail: "no config" };
  try {
    loadConfig(orchDir);
    return { id: "config", label: "Config validity", status: "ok", detail: file };
  } catch (error: unknown) {
    return { id: "config", label: "Config validity", status: "fail", detail: error instanceof Error ? error.message : String(error), fix: "Fix the errors in " + file };
  }
}

async function checkNotifications(bins: BinaryStatus): Promise<CheckResult> {
  if (process.env.HERDR_ENV === "1" && bins.herdr) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "herdr notification tier is available" };
  }
  if (onPath("notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "notify-send tier is available" };
  if (onPath("wsl-notify-send")) return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "wsl-notify-send tier is available" };
  const toast = path.join(repoDir, "scripts", "wsl-toast.ps1");
  if (onPath("powershell.exe") && fs.existsSync(toast)) {
    return { id: "notifications", label: "Desktop notifications", status: "ok", detail: "powershell.exe toast tier is available" };
  }
  return { id: "notifications", label: "Desktop notifications", status: "warn", detail: "no desktop notification tier is available", fix: "Install notify-send or configure a supported desktop notification tier" };
}

async function checkExtensions(bins: BinaryStatus): Promise<CheckResult> {
  if (!bins.pi) return { id: "pi-extensions", label: "pi extensions", status: "skip", detail: "pi is not installed" };
  const extensionDir = path.join(os.homedir(), ".pi", "agent", "extensions");
  const names = ["orchestrator-bridge.ts", "herdr-agent-state.ts"];
  const stale: string[] = [];
  for (const name of names) {
    const destination = path.join(extensionDir, name);
    const source = path.join(repoDir, "extensions", name);
    try {
      if (!fs.lstatSync(destination).isSymbolicLink() || fs.realpathSync(destination) !== fs.realpathSync(source)) stale.push(name);
    } catch {
      stale.push(name);
    }
  }
  return stale.length
    ? { id: "pi-extensions", label: "pi extensions", status: "fail", detail: `missing or stale: ${stale.join(", ")}`, fix: "orch setup --no-install" }
    : { id: "pi-extensions", label: "pi extensions", status: "ok", detail: "orchestrator-bridge and herdr-agent-state are current" };
}

async function checkWorktreeGitignore(): Promise<CheckResult> {
  const worktrees = path.join(process.cwd(), ".orch-worktrees");
  if (!fs.existsSync(worktrees)) return { id: "worktree-gitignore", label: "Worktree gitignore", status: "skip", detail: ".orch-worktrees does not exist" };
  const result = await commandOutput("git", ["check-ignore", "-q", ".orch-worktrees"]);
  return result.ok
    ? { id: "worktree-gitignore", label: "Worktree gitignore", status: "ok", detail: ".orch-worktrees is gitignored" }
    : { id: "worktree-gitignore", label: "Worktree gitignore", status: "warn", detail: ".orch-worktrees is not gitignored", fix: "printf '\\n.orch-worktrees/\\n' >> .gitignore" };
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
