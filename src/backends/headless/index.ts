import { closeSync, mkdirSync, openSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawn as spawnProcess, type ChildProcess } from "node:child_process";
import { orchDir } from "../../presence/writer.ts";
import {  } from "../../presence/store.ts";
import { errorMessage, pidAlive } from "../../util.ts";
import { decisionLogger } from "../../daemon/decision-log.ts";
import { agentLaunchEnv } from "../../policy/spawner.ts";
import { LocalProcessRole } from "../process.ts";
import { agentViews } from "../../store/agent-view.ts";
import { registerSpawnedAgent } from "../../store/spawn-registration.ts";
import { agentChannel, capture } from "../../presence/roles.ts";
import type { Backend, BackendId, BackendSpawnOpts, HandleLookupRole, LogPruningRole, PaneForegroundRole, ProcessRole } from "../../types/backend.ts";
import type { AgentAdapter, SpawnOpts } from "../../types/adapter.ts";
import type { HeadlessBackendDeps, HeadlessHandle } from "../../types/plexer.ts";

const HEADLESS_BACKEND: BackendId = "headless";

/** `orchDir()` owns the default; a backend re-spelling it is how the two drift. */
function orchDirectory(override?: string): string {
  return override ?? orchDir();
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

function makeHeadlessHandle(pid: number, key: string, alive?: boolean): HeadlessHandle {
  const handle: HeadlessHandle = {
    kind: "headless", pid, key, ...(alive === undefined ? {} : { alive }), toString: () => `${pid}:${key}`,
  };
  Object.defineProperty(handle, "kind", { enumerable: false });
  Object.defineProperty(handle, "toString", { enumerable: false });
  return handle;
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
  return typeof pid === "number" && Number.isInteger(pid) && safeKey(key) ? makeHeadlessHandle(pid, key) : undefined;
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




export class HeadlessBackend implements Backend<HeadlessHandle> {
  readonly id = HEADLESS_BACKEND;
  // A detached agent is in no space, so `current` has no answer to give and the
  // role is composed only for the half it CAN do — which means the whole role is
  // absent, and `handleFor` moves to where callers already reach for it.
  // A detached agent is inside nothing, so there is no identity to report.
  readonly identity: null = null;
  /** A detached handle carries the OS pid, which a relaunch replaces, so the
   *  recorded environment is its one source. */
  readonly handleLookup: HandleLookupRole<HeadlessHandle> = {
    handleFor: (key: string): HeadlessHandle | undefined =>
      this.liveHandles().find((handle) => handle.key === key && handle.alive),
  };
  // A detached process has no plexer integration to version.
  readonly versionInfo: null = null;
  readonly logPruning: LogPruningRole = {
    prune: (cutoff: Date, liveKeys: readonly string[], orchDir?: string): number => this.pruneLogFiles(cutoff, liveKeys, orchDir),
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
        env: { ...process.env, ...agentLaunchEnv({ ...opts, key, orchDir: directory }, { ORCH_AGENT_LOG: logPath }) },
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
    const handle = makeHeadlessHandle(pid, key);
    const worktreePath = opts.env?.ORCH_AGENT_WORKTREE;
    const worktreeBranch = opts.env?.ORCH_AGENT_BRANCH;
    const now = Date.now();
    registerSpawnedAgent(directory, {
      key,
      harnessId: adapter.id,
      backendId: HEADLESS_BACKEND,
      // No pane: this environment offers no plexer shortcut to the process. It
      // still has a handle — a concrete address for the process just started —
      // and stating it here is what lets `list`/`close`/`handleFor` reach an
      // agent with no screen without a SECOND write behind the registration.
      pane: false,
      handle: JSON.stringify(handle),
      cwd: opts.cwd ?? process.cwd(),
      name: opts.name ?? opts.env?.ORCH_AGENT_NAME ?? key,
      model: opts.model ?? "",
      spawner: opts.env?.ORCH_SPAWNER_AGENT_ID ?? null,
      worktree: worktreePath && worktreeBranch ? { path: worktreePath, branch: worktreeBranch } : undefined,
      now,
    });
    return handle;
  }

  /** Every registered headless handle with a fresh liveness result. Private:
   *  `handleLookup` is the one public address for this (2.2). */
  private liveHandles(): HeadlessHandle[] {
    const directory = orchDirectory();
    return headlessHandles(directory).map((handle) => makeHeadlessHandle(handle.pid, handle.key, this.isPidAlive(handle.pid)));
  }

  /** Remove old headless logs, retaining every log belonging to a live presence. */
  private pruneLogFiles(cutoff: Date, liveKeys: readonly string[], orchDir?: string): number {
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
        decisionLogger(orchDirectory(orchDir)).warn("retention.sweep-failed", { area: "logs", file, error: errorMessage(error) });
      }
    }
    return removed;
  }
}

/** Shared headless backend instance for command wiring. */
export const headlessBackend = new HeadlessBackend();
