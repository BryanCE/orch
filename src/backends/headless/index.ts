import { closeSync, mkdirSync, openSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn as spawnProcess, type ChildProcess } from "node:child_process";
import type { AgentAdapter, SpawnOpts } from "../../adapters/adapter.ts";
import { readStatus } from "../../presence/writer.ts";
import { presenceAgentDir } from "../../presence/store.ts";
import { errorMessage, pidAlive, projectRoot } from "../../util.ts";
import { LocalProcessRole } from "../process.ts";
import { agentViews } from "../../store/agent-view.ts";
import { registerSpawnedAgent } from "../../store/spawn-registration.ts";
import { ensurePlexer } from "../../store/agent-rows.ts";
import { setAgentPlexer, setHandle } from "../../store/interval-rows.ts";
import { agentChannel, capture } from "../../presence/roles.ts";
import type { Backend, BackendId, BackendSpawnOpts, HandleLookupRole, LogPruningRole, PaneForegroundRole, ProcessRole } from "../../types/backend.ts";

/** Handle owned by one detached headless process. */
export interface HeadlessHandle {
  readonly pid: number;
  readonly key: string;
  /** Updated by list(); absent on a freshly spawned handle. */
  readonly alive?: boolean;
}

const HEADLESS_BACKEND: BackendId = "headless";

function orchDirectory(override?: string): string {
  return override ?? process.env.ORCH_DIR ?? join(homedir(), ".orch");
}

function logDirectory(directory: string): string {
  return join(directory, "logs");
}

function safeKey(key: unknown): key is string {
  return typeof key === "string"
    && key.length > 0
    && key !== "."
    && key !== ".."
    && !key.includes("/")
    && !key.includes("\\");
}

function headlessLogKey(key: string): string {
  return key.replace(/[^A-Za-z0-9_.:-]/g, "_");
}

function logFileName(key: string): string {
  return join(`${headlessLogKey(key)}.log`);
}

function parseHeadlessHandle(value: unknown): HeadlessHandle | undefined {
  if (typeof value !== "string") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const pid: unknown = Reflect.get(parsed, "pid");
  const key: unknown = Reflect.get(parsed, "key");
  return typeof pid === "number" && Number.isInteger(pid) && safeKey(key) ? { pid, key } : undefined;
}

/**
 * Every recorded handle this backend can address.
 *
 * Rule 11: the filter is the declared handle SHAPE, never a plexer id. A handle
 * this backend understands is one it can parse into a live pid/key pair — an
 * agent recorded under some other plexer simply has a handle that means nothing
 * here, and a `backend === "headless"` test would say the same thing while
 * making the model care which environment an agent happens to be in.
 */
function headlessHandles(directory: string): HeadlessHandle[] {
  try {
    return agentViews(directory).flatMap((view) => {
      const handle = parseHeadlessHandle(view.environment.handle);
      return handle ? [handle] : [];
    });
  } catch {
    return [];
  }
}

function statusPid(directory: string, key: string): number | undefined {
  if (!safeKey(key)) return undefined;
  const status = readStatus(presenceAgentDir(key, directory));
  return typeof status.pid === "number" ? status.pid : undefined;
}

function sameHandle(left: HeadlessHandle, right: HeadlessHandle): boolean {
  return left.pid === right.pid && left.key === right.key;
}

function registeredHandle(handle: HeadlessHandle, directory: string): boolean {
  return headlessHandles(directory).some((record) => sameHandle(record, handle));
}

/**
 * Detached process backend. Dead entries stay observable in the agent store,
 * while close can only signal a registered process with matching presence ownership.
 */
export interface HeadlessBackendDeps {
  /** Injected process liveness check and signaler, primarily for hermetic tests. */
  pidAlive?: (pid: number) => boolean;
  killer?: (pid: number, signal: "SIGTERM") => void;
}

export class HeadlessBackend implements Backend<HeadlessHandle> {
  readonly id = HEADLESS_BACKEND;
  // A detached agent is in no space, so `current` has no answer to give and the
  // role is composed only for the half it CAN do — which means the whole role is
  // absent, and `handleFor` moves to where callers already reach for it.
  // A detached agent is inside nothing, so there is no identity to report.
  readonly identity: null = null;
  readonly handleLookup: HandleLookupRole<HeadlessHandle> = {
    handleFor: (key: string): HeadlessHandle | undefined => this.handleFor(key),
  };
  // A detached process has no plexer integration to version.
  readonly versionInfo: null = null;
  readonly logPruning: LogPruningRole = {
    prune: (cutoff: Date, liveKeys: readonly string[], orchDir?: string): number => this.pruneLogs(cutoff, liveKeys, orchDir),
  };
  readonly channel = agentChannel;
  readonly capture = capture;
  readonly paneHost = null;
  readonly paneInventory = null;
  readonly paneInput = null;
  readonly paneForeground: PaneForegroundRole<HeadlessHandle> | null = null;
  readonly paneScreen = null;
  readonly paneZoom = null;
  readonly paneNaming = null;
  readonly agentNaming = null;
  readonly agentStatus = null;
  readonly groupHome = null;
  readonly groupLayout = null;
  readonly spaceHome = null;
  private readonly isPidAlive: (pid: number) => boolean;
  private readonly killer: (pid: number, signal: "SIGTERM") => void;
  readonly process: ProcessRole;

  /** Headless is a detached process; it needs no external binary. */
  isAvailable(): boolean {
    return true;
  }

  /** Headless has no session concept; it is always usable. */
  isInsideSession(): boolean {
    return true;
  }

  constructor(deps: HeadlessBackendDeps = {}) {
    this.isPidAlive = deps.pidAlive ?? ((pid) => pidAlive(pid));
    this.killer = deps.killer ?? ((pid, signal) => process.kill(pid, signal));
    this.process = new LocalProcessRole({
      isAlive: this.isPidAlive,
      signal: (pid, signal) => {
        if (signal === "SIGTERM") this.killer(pid, signal);
        else process.kill(pid, signal);
      },
    });
  }

  /** Start the adapter's restricted worker command detached, redirecting output to a log. */
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): HeadlessHandle {
    const directory = orchDirectory(opts.orchDir);
    // The caller mints the serialized identity BEFORE launch (one key per agent)
    // and passes it via ORCH_AGENT_KEY; the backend never mints a second one. The
    // OS pid is recorded separately (below) for close-time ownership checks; it is
    // not part of the identity handle.
    const key = opts.key;
    if (!safeKey(key)) throw new Error(`headless spawn requires a caller-minted presence key (ORCH_AGENT_KEY); got ${JSON.stringify(key)}`);

    const adapterOpts: SpawnOpts = {
      key,
      cwd: opts.cwd,
      model: opts.model,
      preferredModels: opts.preferredModels,
      orchDir: directory,
      env: opts.env,
      tools: opts.tools,
      workers: opts.workers,
    };
    // A headless agent runs its prompt and exits, so work sent after launch
    // arrives at a dead process: the prompt is the only way in.
    const prompt = opts.prompt ?? "";
    if (!prompt.trim()) throw new Error(`cannot spawn a headless ${String(adapter.id)} agent with no prompt: a headless agent runs its prompt and exits, so it has nothing to do`);
    const argv = adapter.workerLaunch?.restrictedHeadlessCmd(prompt, adapterOpts)
      ?? adapter.headlessCmd(prompt, adapterOpts);
    // The final argv entry is the initial prompt; the executable itself must always be non-empty.
    if (!Array.isArray(argv) || argv.length === 0 || typeof argv[0] !== "string" || argv[0].length === 0
      || argv.slice(1).some((part) => typeof part !== "string")) {
      throw new Error(`adapter ${String(adapter.id)} returned an invalid headless command`);
    }

    mkdirSync(logDirectory(directory), { recursive: true });
    const logPath = join(logDirectory(directory), logFileName(key));
    const logFd = openSync(logPath, "a");
    let child: ChildProcess;
    try {
      child = spawnProcess(argv[0], argv.slice(1), {
        cwd: opts.cwd,
        detached: true,
        // ORCH_AGENT_LOG mirrors the recorded log path (D3a) to the presence
        // writer running inside the child, so its own status.json can stamp
        // the same sessionPath as this backend's log.
        env: { ...process.env, ORCH_DIR: directory, ORCH_AGENT_KEY: key, ORCH_AGENT_LOG: logPath, ORCH_PROJECT: projectRoot(), ...(opts.env ?? {}) },
        // stdin MUST reach EOF: a pi-shaped harness reads its prompt from an open
        // stdin and blocks there before starting a session, so it never registers.
        stdio: ["ignore", logFd, logFd],
      });
    } catch (error) {
      closeSync(logFd);
      throw error;
    }
    closeSync(logFd);

    const pid = child.pid;
    if (!pid) throw new Error(`adapter ${String(adapter.id)} did not provide a process id`);
    const handle: HeadlessHandle = { pid, key };
    const worktreePath = opts.env?.ORCH_AGENT_WORKTREE;
    const worktreeBranch = opts.env?.ORCH_AGENT_BRANCH;
    const now = Date.now();
    const agentId = registerSpawnedAgent(directory, {
      key,
      harnessId: adapter.id,
      backendId: HEADLESS_BACKEND,
      // No pane: this environment offers no plexer shortcut to the process.
      pane: false,
      cwd: opts.cwd ?? process.cwd(),
      name: opts.name ?? opts.env?.ORCH_AGENT_NAME ?? key,
      model: opts.model ?? "",
      spawner: opts.env?.ORCH_SPAWNER_AGENT_ID ?? null,
      worktree: worktreePath && worktreeBranch ? { path: worktreePath, branch: worktreeBranch } : undefined,
      now,
    });
    // A handle is not a pane. This environment has no pane to show, and it still
    // hands orch a concrete address for the process it just started — recording
    // it is what lets `list`/`close`/`handleFor` reach an agent with no screen.
    ensurePlexer(directory, HEADLESS_BACKEND, HEADLESS_BACKEND, now);
    setAgentPlexer(directory, agentId, HEADLESS_BACKEND);
    setHandle(directory, agentId, now, JSON.stringify(handle));
    return handle;
  }

  /**
   * Signal only a process still represented by its registered presence pid.
   * Missing/mismatched status is a refusal, not a best-effort kill.
   */
  close(handle: HeadlessHandle): boolean {
    const directory = orchDirectory();
    const resolved = typeof handle === "string" ? parseHeadlessHandle(handle) : handle;
    if (!resolved || !Number.isInteger(resolved.pid) || !safeKey(resolved.key)) return false;
    if (!registeredHandle(resolved, directory)) return false;
    if (statusPid(directory, resolved.key) !== resolved.pid) return false;
    if (!this.isPidAlive(resolved.pid)) return false;
    try {
      this.killer(resolved.pid, "SIGTERM");
      return true;
    } catch {
      return false;
    }
  }

  /** The live handle for one agent key. A detached handle carries the OS pid,
   *  which a relaunch replaces, so the recorded environment is its one source. */
  handleFor(key: string): HeadlessHandle | undefined {
    return this.list().find((handle) => handle.key === key && handle.alive);
  }

  /** Return every registered headless handle with a fresh liveness result. */
  list(): HeadlessHandle[] {
    const directory = orchDirectory();
    return headlessHandles(directory).map((handle) => ({
      ...handle,
      alive: this.isPidAlive(handle.pid),
    }));
  }

  /** Headless has no console UI, so it cannot focus a target. */
  // fallow-ignore-next-line unused-class-member
  focus(_handle: HeadlessHandle): boolean {
    return false;
  }

  /** Headless has no console UI, so it cannot send keystrokes. */
  sendKeys(_handle: HeadlessHandle, _keys: readonly string[]): boolean {
    return false;
  }

  /** Headless has no workspace naming; ids stand in for names. */
  workspaceNames(): Map<string, string> {
    return new Map();
  }

  /** Remove old headless logs, retaining every log belonging to a live presence. */
  pruneLogs(cutoff: Date, liveKeys: readonly string[], orchDir?: string): number {
    const logsDir = logDirectory(orchDirectory(orchDir));
    let names: string[];
    try {
      names = readdirSync(logsDir);
    } catch {
      return 0;
    }
    const liveNames = new Set(liveKeys.map((key) => `${headlessLogKey(key)}.log`));
    let removed = 0;
    for (const name of names) {
      if (!name.endsWith(".log")) continue;
      const file = join(logsDir, name);
      let stat;
      try {
        stat = statSync(file);
      } catch {
        continue;
      }
      if (!stat.isFile() || stat.mtimeMs >= cutoff.getTime() || liveNames.has(name)) continue;
      try {
        rmSync(file, { force: true });
        removed++;
      } catch (error: unknown) {
        process.stderr.write(`Warning: retention sweep logs failed for ${file}: ${errorMessage(error)}\n`);
      }
    }
    return removed;
  }
}

/** Shared headless backend instance for command wiring. */
export const headlessBackend = new HeadlessBackend();
