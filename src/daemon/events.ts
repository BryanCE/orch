import { mkdirSync, readdirSync, statSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { collapse } from "../entities.ts";
import { notify, type NotifyEvent, type Sink } from "../notify.ts";
import { pidAlive, readJSON } from "../store.ts";
import { truncate } from "../table.ts";
import { rpcCall, rpcSubscribe } from "./rpc.ts";

const WORKER_PROMPT_HEADER = "[orch worker] No human watches this pane. For any decision you cannot make yourself, call orch_ask and wait for the orchestrator. NEVER use ask-user/question tools.";

export type PresenceMetadata = {
  name: string | null;
  tab: string | null;
  pid?: number;
};

export type PresenceWatchOptions = {
  orchDir: string;
  onEvent: (event: NotifyEvent) => void;
  initialStates?: Map<string, string>;
  keys?: Map<string, PresenceMetadata>;
  metadataFor?: (key: string) => PresenceMetadata;
  acceptKey?: (key: string) => boolean;
  pollIntervalMs?: number;
};

export type PresenceWatch = {
  states: Map<string, string>;
  scan: () => void;
  stop: () => void;
};

export type PreferredEventsOptions = {
  orchDir: string;
  onEvent: (event: unknown) => void;
  onFallback: () => void;
  onDisconnect: () => void;
  probeIntervalMs?: number;
};

export type PreferredEvents = {
  mode: "daemon" | "files";
  stop: () => void;
};

function eventModel(status: unknown): string | null {
  if (!status || typeof status !== "object") return null;
  const model = Reflect.get(status, "model");
  if (!model || typeof model !== "object") return null;
  const id = Reflect.get(model, "id");
  if (typeof id !== "string" || !id) return null;
  const thinking = Reflect.get(status, "thinking");
  return `${id}${thinking ? `:${String(thinking)}` : ""}`;
}

function statusState(status: unknown, fallbackPid?: number): string | null {
  if (!status || typeof status !== "object") {
    if (fallbackPid === undefined) return null;
    return pidAlive(fallbackPid) ? null : "exited";
  }
  const pidValue = Reflect.get(status, "pid");
  const pid = typeof pidValue === "number" ? pidValue : fallbackPid;
  let state: string | null = null;
  if (Reflect.get(status, "asking")) state = "blocked";
  else if (Reflect.get(status, "state")) state = String(Reflect.get(status, "state"));
  if (!pidAlive(pid)) state = "exited";
  return state;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function eventTask(status: object): string | undefined {
  const asking = Reflect.get(status, "asking");
  if (asking && typeof asking === "object") {
    const question = Reflect.get(asking, "question");
    if (typeof question === "string") return `Q: ${truncate(collapse(question), 80)}`;
  }
  const task = Reflect.get(status, "task");
  if (typeof task !== "string") return undefined;
  const realTask = (task.startsWith(WORKER_PROMPT_HEADER)
    ? task.slice(WORKER_PROMPT_HEADER.length)
    : task).trimStart();
  if (!realTask) return undefined;
  return truncate(collapse(realTask), 80);
}

/** Derive one transition from a status file. First observations only seed state. */
export function derivePresenceTransition(
  key: string,
  status: unknown,
  metadata: PresenceMetadata,
  states: Map<string, string>,
  now = new Date(),
): NotifyEvent | null {
  const state = statusState(status, metadata.pid);
  if (!state) return null;
  const previous = states.get(key);
  if (previous === state) return null;
  states.set(key, state);
  if (previous === undefined) return null;
  const value = status && typeof status === "object" ? status : {};
  const label = optionalString(Reflect.get(value, "label"));
  const tabLabel = optionalString(Reflect.get(value, "tabLabel"));
  const cost = Reflect.get(value, "cost");
  const lastError = optionalString(Reflect.get(value, "lastError"));
  return {
    key,
    workspace: key.includes(":") ? key.slice(0, key.indexOf(":")) : undefined,
    agent: label ?? metadata.name,
    tab: tabLabel ?? metadata.tab,
    model: eventModel(value),
    oldState: previous,
    newState: state,
    task: eventTask(value),
    cost: typeof cost === "number" ? cost : undefined,
    ts: now.toISOString(),
    lastError: lastError === undefined ? undefined : collapse(lastError),
  };
}

function directoryNames(directory: string): string[] {
  try {
    return readdirSync(directory).filter((name) => {
      try {
        return statSync(join(directory, name)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/** Continuously watch presence status files, sharing the CLI transition rules. */
export function startPresenceWatch(options: PresenceWatchOptions): PresenceWatch {
  const agentsDir = join(options.orchDir, "agents");
  mkdirSync(agentsDir, { recursive: true });
  const states = options.initialStates ?? new Map<string, string>();
  const watchers = new Map<string, FSWatcher>();
  let stopped = false;
  let rootWatcher: FSWatcher | undefined;

  const check = (key: string): void => {
    if (stopped) return;
    const metadata = options.keys?.get(key) ?? options.metadataFor?.(key) ?? { name: null, tab: null };
    const event = derivePresenceTransition(key, readJSON(join(agentsDir, key, "status.json")), metadata, states);
    if (event) options.onEvent(event);
  };
  const attach = (key: string): void => {
    if (watchers.has(key)) return;
    try {
      const watcher = watch(join(agentsDir, key), (_event, filename) => {
        if (!filename || filename.toString() === "status.json") check(key);
      });
      watcher.on("error", () => {});
      watchers.set(key, watcher);
    } catch {}
  };
  const selectedKeys = (): string[] => options.keys
    ? [...options.keys.keys()]
    : directoryNames(agentsDir).filter((key) => options.acceptKey?.(key) ?? true);
  const scan = (): void => {
    // Snapshot delivered states, then arm every watcher before reconciliation.
    const lastSeen = new Map(states);
    const keys = selectedKeys();
    for (const key of keys) attach(key);
    for (const key of keys) {
      // A callback that delivered this state while watchers were arming owns it.
      if (lastSeen.get(key) !== states.get(key)) continue;
      check(key);
    }
  };
  try {
    rootWatcher = watch(agentsDir, () => scan());
    rootWatcher.on("error", () => {});
  } catch {}
  scan();
  const safety = setInterval(scan, options.pollIntervalMs ?? 5_000);
  return {
    states,
    scan,
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(safety);
      rootWatcher?.close();
      for (const watcher of watchers.values()) watcher.close();
    },
  };
}

/** Prefer an RPC event stream, then invoke direct-file fallback once on disconnect. */
export async function startPreferredEvents(options: PreferredEventsOptions): Promise<PreferredEvents> {
  let stopSubscription: (() => void) | undefined;
  let probe: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  let fellBack = false;
  const fallback = (disconnected: boolean): void => {
    if (stopped || fellBack) return;
    fellBack = true;
    if (probe) clearInterval(probe);
    stopSubscription?.();
    if (disconnected) options.onDisconnect();
    options.onFallback();
  };
  try {
    stopSubscription = await rpcSubscribe(options.orchDir, "subscribe-events", options.onEvent);
  } catch {
    fallback(false);
    return { mode: "files", stop: () => { stopped = true; } };
  }
  probe = setInterval(() => {
    void rpcCall(options.orchDir, "daemon-status", undefined, 200).catch(() => fallback(true));
  }, options.probeIntervalMs ?? 500);
  return {
    mode: "daemon",
    stop: () => {
      stopped = true;
      if (probe) clearInterval(probe);
      stopSubscription?.();
    },
  };
}

export function emitAndNotify(emit: (event: unknown) => void, sinks: Sink[], event: NotifyEvent): void {
  emit(event);
  notify(sinks, event);
}
