import { mkdirSync, readdirSync, statSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { collapse } from "../entities.ts";
import { notify, type Sink } from "../notify/router.ts";
import { abstractAgentLabel, workspaceLabelForKey, type NotifyEvent } from "../notify/format.ts";
import { STATUS_FILE } from "../presence/schema.ts";
import { namesPresenceFile } from "../presence/writer.ts";
import { presenceAgentDir, presenceKeyFromDirectoryName, readPresenceStatus } from "../presence/store.ts";
import { pidAlive, truncate } from "../util.ts";
import { workspaceOf } from "../policy/workspace.ts";
import { stripWorkerHeader } from "../worker-prompt.ts";
import { optionalString } from "../util.ts";

export interface PresenceMetadata {
  name: string | null;
  tab: string | null;
  pid?: number;
};

export interface PresenceWatchOptions {
  orchDir: string;
  onEvent: (event: NotifyEvent) => void;
  initialStates?: Map<string, string>;
  keys?: Map<string, PresenceMetadata>;
  metadataFor?: (key: string) => PresenceMetadata;
  acceptKey?: (key: string) => boolean;
  pollIntervalMs?: number;
};

export interface PresenceWatch {
  states: Map<string, string>;
  scan: () => void;
  stop: () => void;
};

function property(value: object, key: string): unknown {
  return Reflect.get(value, key) as unknown;
}

function eventModel(status: unknown): string | null {
  if (!status || typeof status !== "object") return null;
  const model = property(status, "model");
  if (!model || typeof model !== "object") return null;
  const id = property(model, "id");
  if (typeof id !== "string" || !id) return null;
  const thinking = property(status, "thinking");
  return `${id}${thinking ? `:${JSON.stringify(thinking) ?? ""}` : ""}`;
}

function statusState(status: unknown, fallbackPid?: number): string | null {
  if (!status || typeof status !== "object") {
    if (fallbackPid === undefined) return null;
    return pidAlive(fallbackPid) ? null : "exited";
  }
  const pidValue = property(status, "pid");
  const pid = typeof pidValue === "number" ? pidValue : fallbackPid;
  let state: string | null = null;
  if (property(status, "asking")) state = "blocked";
  else if (property(status, "state")) state = String(property(status, "state"));
  if (!pidAlive(pid)) state = "exited";
  return state;
}

function eventTask(status: object): string | undefined {
  const asking = property(status, "asking");
  if (asking && typeof asking === "object") {
    const question = property(asking, "question");
    if (typeof question === "string") return `Q: ${truncate(collapse(question), 80)}`;
  }
  const task = property(status, "task");
  if (typeof task !== "string") return undefined;
  const realTask = stripWorkerHeader(task);
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
  const workspace = workspaceOf(key) ?? undefined;
  const assignedName = optionalString(property(value, "agent"));
  const label = optionalString(property(value, "label"));
  const tabLabel = optionalString(property(value, "tabLabel"));
  const cost = property(value, "cost");
  const lastError = optionalString(property(value, "lastError"));
  return {
    key,
    workspace,
    // Presence is authoritative; the abstract label keeps events usable when
    // a legacy/future harness has not supplied a human name.
    agent: assignedName ?? label ?? metadata.name ?? abstractAgentLabel(workspace ?? "workspace", key),
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

/** Continuously watch presence status files and derive transitions from them.
 *
 * DAEMON-ONLY. Presence files are the harness→orch ingress: shims write them and
 * orchd is the single reader that turns them into events. Clients never watch
 * them — `orch events` subscribes over RPC, with no file-watch fallback when the
 * daemon is absent. Importing this outside `src/daemon/` reintroduces the second
 * event source this layering exists to prevent. */
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
    const event = derivePresenceTransition(key, readPresenceStatus(join(presenceAgentDir(key, options.orchDir), STATUS_FILE)), metadata, states);
    if (event) options.onEvent(event);
  };
  const attach = (key: string): void => {
    if (watchers.has(key)) return;
    try {
      const watcher = watch(presenceAgentDir(key, options.orchDir), (_event, filename) => {
        if (!filename || namesPresenceFile(filename.toString(), STATUS_FILE)) check(key);
      });
      watcher.on("error", () => { /* noop */ });
      watchers.set(key, watcher);
    } catch {}
  };
  const selectedKeys = (): string[] => options.keys
    ? [...options.keys.keys()]
    : directoryNames(agentsDir)
      .map(presenceKeyFromDirectoryName)
      .filter((key) => options.acceptKey?.(key) ?? true);
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
    rootWatcher.on("error", () => { /* noop */ });
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

export function emitAndNotify(emit: (event: unknown) => void, sinks: Sink[], event: NotifyEvent): void {
  const workspace = event.workspace ?? workspaceLabelForKey(event.key);
  const canonical: NotifyEvent = event.agent?.trim()
    ? event
    : { ...event, agent: abstractAgentLabel(workspace, event.key), workspace };
  emit(canonical);
  notify(sinks, canonical);
}
