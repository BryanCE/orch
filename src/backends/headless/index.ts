import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn as spawnProcess, type ChildProcess } from "node:child_process";
import type { AgentAdapter, SpawnOpts } from "../../adapters/adapter.ts";
import { pidAlive, presenceAgentDir } from "../../store.ts";
import type {
  Backend,
  BackendCapabilities,
  BackendRegistryRecord,
  BackendSpawnOpts,
  DeliverPayload,
} from "../backend.ts";
import { parseIdentity, serializeIdentity, type Identity } from "../identity.ts";

/** Handle owned by one detached headless process. */
export interface HeadlessHandle {
  readonly pid: number;
  readonly key: string;
  /** Updated by list(); absent on a freshly spawned handle. */
  readonly alive?: boolean;
}

type HeadlessRegistryRecord = BackendRegistryRecord<HeadlessHandle>;

const HEADLESS_BACKEND = "headless";
/** Headless agents run on the local machine and report the literal workspace `local`. */
const HEADLESS_WORKSPACE = "local";
let generatedKey = 0;

function orchDirectory(override?: string): string {
  return override ?? process.env.ORCH_DIR ?? join(homedir(), ".orch");
}

function registryPath(directory: string): string {
  return join(directory, "spawned.jsonl");
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

function logFileName(key: string, pid: number): string {
  const printable = key.replace(/[^A-Za-z0-9_.:-]/g, "_");
  return join(`${printable}-${pid}.log`);
}

function isRecord(value: unknown): value is HeadlessRegistryRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HeadlessRegistryRecord>;
  const handle = candidate.handle;
  return candidate.backend === HEADLESS_BACKEND
    && typeof candidate.adapter === "string"
    && !!handle
    && typeof handle === "object"
    && typeof (handle as Partial<HeadlessHandle>).pid === "number"
    && typeof (handle as Partial<HeadlessHandle>).key === "string";
}

/** Read valid headless records, ignoring corrupt or unrelated registry lines. */
function readHeadlessRegistry(directory = orchDirectory()): HeadlessRegistryRecord[] {
  try {
    return readFileSync(registryPath(directory), "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .flatMap((line) => {
        try {
          const value: unknown = JSON.parse(line);
          return isRecord(value) ? [value] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

function appendRegistry(record: HeadlessRegistryRecord, directory: string): void {
  mkdirSync(directory, { recursive: true });
  const line = JSON.stringify(record) + "\n";
  writeFileSync(registryPath(directory), line, { flag: "a" });
}

function statusPid(directory: string, key: string): number | undefined {
  if (!safeKey(key)) return undefined;
  try {
    const status: unknown = JSON.parse(readFileSync(join(presenceAgentDir(key, directory), "status.json"), "utf8"));
    if (!status || typeof status !== "object" || Array.isArray(status)) return undefined;
    const pid: unknown = Reflect.get(status, "pid");
    return typeof pid === "number" ? pid : undefined;
  } catch {
    return undefined;
  }
}

function sameHandle(left: HeadlessHandle, right: HeadlessHandle): boolean {
  return left.pid === right.pid && left.key === right.key;
}

function registeredHandle(handle: HeadlessHandle, directory: string): boolean {
  return readHeadlessRegistry(directory).some((record) => sameHandle(record.handle, handle));
}

/**
 * Detached process backend. The registry is append-only; dead entries remain
 * observable, while close can only signal a registered process with matching
 * presence ownership.
 */
export interface HeadlessBackendDeps {
  /** Injected process liveness check and signaler, primarily for hermetic tests. */
  pidAlive?: (pid: number) => boolean;
  killer?: (pid: number, signal: "SIGTERM") => void;
}

export class HeadlessBackend implements Backend<HeadlessHandle> {
  readonly id = HEADLESS_BACKEND;
  // Required by the Backend contract even though headless has no pane UI.
  // fallow-ignore-next-line unused-class-member
  readonly panes = false;
  // Required by the Backend contract even though headless has no pane UI.
  // fallow-ignore-next-line unused-class-member
  readonly focusable = false;
  readonly canSendKeys = false;
  readonly caps: BackendCapabilities = { panes: false, focusable: false, canSendKeys: false };
  private readonly isPidAlive: (pid: number) => boolean;
  private readonly killer: (pid: number, signal: "SIGTERM") => void;

  /** Headless is a detached process; it needs no external binary. */
  isAvailable(): boolean {
    return true;
  }

  /** Headless has no session concept; it is always usable. */
  isInsideSession(): boolean {
    return true;
  }

  /** Recover the identity a headless handle was spawned with (its key is the
   *  serialized identity minted at spawn). */
  mintIdentity(handle: HeadlessHandle): Identity {
    return parseIdentity(handle.key);
  }

  constructor(deps: HeadlessBackendDeps = {}) {
    this.isPidAlive = deps.pidAlive ?? ((pid) => pidAlive(pid));
    this.killer = deps.killer ?? ((pid, signal) => process.kill(pid, signal));
  }

  /** Start the adapter's restricted worker command detached, redirecting output to a log. */
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): HeadlessHandle {
    const directory = orchDirectory(opts.orchDir);
    // Mint the serialized identity as the presence key BEFORE launch so it can be
    // passed opaquely via ORCH_AGENT_KEY. The OS pid is recorded separately (below)
    // for close-time ownership checks; it is not part of the identity handle.
    const key = opts.key ?? serializeIdentity({
      backend: HEADLESS_BACKEND,
      workspace: HEADLESS_WORKSPACE,
      handle: `${process.pid}-${++generatedKey}`,
    });
    if (!safeKey(key)) throw new Error(`invalid headless presence key: ${JSON.stringify(key)}`);

    const adapterOpts: SpawnOpts = {
      key,
      cwd: opts.cwd,
      model: opts.model,
      orchDir: directory,
      env: opts.env,
      tools: opts.tools,
    };
    const argv = adapter.restrictedHeadlessCmd?.(opts.prompt ?? "", adapterOpts)
      ?? adapter.headlessCmd(opts.prompt ?? "", adapterOpts);
    // The final argv entry is the initial prompt and may legitimately be empty
    // for `orch spawn`, while the executable itself must always be non-empty.
    if (!Array.isArray(argv) || argv.length === 0 || typeof argv[0] !== "string" || argv[0].length === 0
      || argv.slice(1).some((part) => typeof part !== "string")) {
      throw new Error(`adapter ${String(adapter.id)} returned an invalid headless command`);
    }

    mkdirSync(logDirectory(directory), { recursive: true });
    const logPath = join(logDirectory(directory), logFileName(key, Date.now()));
    const logFd = openSync(logPath, "a");
    let child: ChildProcess;
    try {
      child = spawnProcess(argv[0], argv.slice(1), {
        cwd: opts.cwd,
        detached: true,
        // ORCH_AGENT_LOG mirrors the recorded log path (D3a) to the presence
        // writer running inside the child, so its own status.json can stamp
        // the same sessionPath the backend registry records below.
        env: { ...process.env, ORCH_DIR: directory, ORCH_AGENT_KEY: key, ORCH_AGENT_LOG: logPath, ...(opts.env ?? {}) },
        stdio: ["ignore", logFd, logFd],
      });
    } catch (error) {
      closeSync(logFd);
      throw error;
    }
    closeSync(logFd);
    child.unref();

    const pid = child.pid;
    if (!pid) throw new Error(`adapter ${String(adapter.id)} did not provide a process id`);
    const handle: HeadlessHandle = { pid, key };
    appendRegistry({ backend: HEADLESS_BACKEND, handle, adapter: String(adapter.id), cwd: opts.cwd, log: logPath }, directory);
    return handle;
  }

  /**
   * Signal only a process still represented by its registered presence pid.
   * Missing/mismatched status is a refusal, not a best-effort kill.
   */
  close(handle: HeadlessHandle): boolean {
    const directory = orchDirectory();
    if (!handle || !Number.isInteger(handle.pid) || !safeKey(handle.key)) return false;
    if (!registeredHandle(handle, directory)) return false;
    if (statusPid(directory, handle.key) !== handle.pid) return false;
    if (!this.isPidAlive(handle.pid)) return false;
    try {
      this.killer(handle.pid, "SIGTERM");
      return true;
    } catch {
      return false;
    }
  }

  /** Return every registered headless handle with a fresh liveness result. */
  list(): HeadlessHandle[] {
    const directory = orchDirectory();
    return readHeadlessRegistry(directory).map(({ handle }) => ({
      ...handle,
      alive: this.isPidAlive(handle.pid),
    }));
  }

  /** Headless has no console UI, so it cannot deliver text. */
  deliver(_handle: HeadlessHandle, _payload: DeliverPayload): boolean {
    return false;
  }

  /** Headless has no console UI, so it cannot focus a target. */
  focus(_handle: HeadlessHandle): boolean {
    return false;
  }

  /** Headless has no console UI, so it cannot send keystrokes. */
  sendKeys(_handle: HeadlessHandle, _keys: readonly string[]): boolean {
    return false;
  }

  /** Headless has no console UI, so it cannot apply a pane layout. */
  // fallow-ignore-next-line unused-class-member
  applyLayout(_group: string, _layout: "tiled"): boolean {
    return false;
  }
}

/** Shared headless backend instance for command wiring. */
export const headlessBackend = new HeadlessBackend();
