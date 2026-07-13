import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn as spawnProcess, type ChildProcess } from "node:child_process";
import type { AgentAdapter, SpawnOpts } from "../adapters/adapter.ts";
import { pidAlive } from "../store.ts";
import type {
  Backend,
  BackendCapabilities,
  BackendRegistryRecord,
  BackendSpawnOpts,
} from "./backend.ts";

/** Handle owned by one detached headless process. */
export interface HeadlessHandle {
  readonly pid: number;
  readonly key: string;
  /** Updated by list(); absent on a freshly spawned handle. */
  readonly alive?: boolean;
}

export type HeadlessRegistryRecord = BackendRegistryRecord<HeadlessHandle>;

const HEADLESS_BACKEND = "headless";
const DEFAULT_ORCH_DIR = join(homedir(), ".orch");

function orchDirectory(override?: string): string {
  return override || process.env.ORCH_DIR || DEFAULT_ORCH_DIR;
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
export function readHeadlessRegistry(directory = orchDirectory()): HeadlessRegistryRecord[] {
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
    const status = JSON.parse(readFileSync(join(directory, "agents", key, "status.json"), "utf8"));
    return typeof status?.pid === "number" ? status.pid : undefined;
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
export class HeadlessBackend implements Backend<HeadlessHandle> {
  readonly id = HEADLESS_BACKEND;
  readonly panes = false;
  readonly focusable = false;
  readonly caps: BackendCapabilities = { panes: false, focusable: false };

  /** Start adapter.headlessCmd() detached, redirecting both output streams to a log. */
  spawn(adapter: AgentAdapter, opts: BackendSpawnOpts): HeadlessHandle {
    const directory = orchDirectory(opts.orchDir);
    const key = opts.key || `session-pending`;
    if (!safeKey(key)) throw new Error(`invalid headless presence key: ${key}`);

    const adapterOpts: SpawnOpts = {
      key: opts.key,
      cwd: opts.cwd,
      model: opts.model,
      orchDir: directory,
      env: opts.env,
    };
    const argv = adapter.headlessCmd(opts.prompt || "", adapterOpts);
    if (!Array.isArray(argv) || argv.length === 0 || argv.some((part) => typeof part !== "string" || part.length === 0)) {
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
        env: { ...process.env, ORCH_DIR: directory, ...(opts.env || {}) },
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
    const actualKey = opts.key || `session-${pid}`;
    const handle: HeadlessHandle = { pid, key: actualKey };
    appendRegistry({ backend: HEADLESS_BACKEND, handle, adapter: String(adapter.id) }, directory);
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
    if (!pidAlive(handle.pid)) return false;
    try {
      process.kill(handle.pid, "SIGTERM");
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
      alive: pidAlive(handle.pid),
    }));
  }
}

/** Shared headless backend instance for command wiring. */
export const headlessBackend = new HeadlessBackend();
