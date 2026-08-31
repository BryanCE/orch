import { mkdirSync, readdirSync, statSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { collapse } from "../entities.ts";
import { notify } from "../notify/router.ts";
import { abstractAgentLabel, spaceLabelForKey } from "../notify/format.ts";
import { RESULT_FILE, STATUS_FILE } from "../presence/schema.ts";
import { namesPresenceFile } from "../presence/writer.ts";
import { loadPresence, presenceAgentDir, readJSON, readPresenceStatus } from "../presence/store.ts";
import { agentView, agentViews } from "../store/agent-view.ts";
import { computeFleetCapacity } from "../policy/capacity.ts";
import { loadSettings } from "../settings/read.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { upsertRun } from "../store/run-rows.ts";
import { pidAlive, truncate } from "../util.ts";
import type { AgentState } from "../adapters/adapter.ts";
import { isAgentState } from "../agent-state.ts";
import { stripWorkerHeader } from "../worker-prompt.ts";
import { optionalString } from "../util.ts";
import type { RunRecord } from "../types/store.ts";
import type { PresenceStatus } from "../types/presence.ts";
import type { PresenceMetadata, PresenceWatch, PresenceWatchOptions } from "../types/daemon.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { NotifyEntry } from "../types/settings.ts";

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

function eventTokens(status: object): NotifyEvent["tokens"] | undefined {
  const raw = property(status, "tokens");
  if (!raw || typeof raw !== "object") return undefined;
  const input = property(raw, "input");
  const output = property(raw, "output");
  const cacheRead = property(raw, "cacheRead");
  const cacheWrite = property(raw, "cacheWrite");
  const values = [input, output, cacheRead, cacheWrite];
  if (values.some((value) => value !== undefined && typeof value !== "number")) return undefined;
  if (values.every((value) => value === undefined)) return undefined;
  const normalized: NonNullable<NotifyEvent["tokens"]> = {};
  if (typeof input === "number") normalized.input = input;
  if (typeof output === "number") normalized.output = output;
  if (typeof cacheRead === "number") normalized.cacheRead = cacheRead;
  if (typeof cacheWrite === "number") normalized.cacheWrite = cacheWrite;
  return normalized;
}

function statusState(status: unknown, fallbackPid?: number): AgentState | null {
  if (!status || typeof status !== "object") {
    if (fallbackPid === undefined) return null;
    return pidAlive(fallbackPid) ? null : "exited";
  }
  const pidValue = property(status, "pid");
  const pid = typeof pidValue === "number" ? pidValue : fallbackPid;
  let state: AgentState | null = null;
  if (property(status, "asking")) state = "asking";
  else if (property(status, "state")) {
    const candidate = String(property(status, "state"));
    state = isAgentState(candidate) ? candidate : "unknown";
  }
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

interface PresenceTransition {
  state: AgentState;
  previous: string;
}

/** Advance the observed state, suppressing initial and duplicate observations. */
function nextPresenceTransition(
  key: string,
  status: unknown,
  pid: number | undefined,
  states: Map<string, string>,
): PresenceTransition | null {
  const state = statusState(status, pid);
  if (!state) return null;
  const previous = states.get(key);
  if (previous === state) return null;
  states.set(key, state);
  return previous === undefined ? null : { state, previous };
}

function statusObject(status: unknown): object {
  return status && typeof status === "object" ? status : {};
}

interface PresenceIdentityFields {
  space: string | undefined;
  agent: string;
  name: string | null;
  dispatchId: string | undefined;
  spawnedBy: string | undefined;
  spawnedByLabel: string | undefined;
  tab: string | null;
  model: string | null;
}

function identityFields(
  orchDir: string,
  key: string,
  value: object,
  metadata: PresenceMetadata,
): PresenceIdentityFields {
  // A1: the four facts are read back together through the one composer. A key
  // that names no agent has no name and no environment - that is an answer, not
  // a row to go looking for under a second id.
  const normalizedId = tryParseIdentity(key)?.id;
  const view = normalizedId === undefined ? null : agentView(orchDir, normalizedId);
  const space = view?.environment.space ?? undefined;
  const normalizedName = view?.name ?? null;
  const assignedName = optionalString(property(value, "agent"));
  const label = optionalString(property(value, "label"));
  const tabLabel = optionalString(property(value, "tabLabel"));
  const dispatchId = optionalString(property(value, "dispatchId"));
  const spawnedBy = optionalString(property(value, "spawnedBy")) ?? metadata.spawnedBy;
  const spawnedByLabel = optionalString(property(value, "spawnedByLabel")) ?? metadata.spawnedByLabel;
  return {
    space,
    // Status supplies the agent's self-reported label; placement comes from orch's registry.
    agent: assignedName ?? label ?? metadata.name ?? abstractAgentLabel(space ?? "space", key),
    name: normalizedName ?? label ?? metadata.name ?? null,
    dispatchId,
    spawnedBy,
    spawnedByLabel,
    tab: tabLabel ?? metadata.tab,
    model: eventModel(value),
  };
}

interface PresenceActivityFields {
  task: string | undefined;
  cost: number | undefined;
  lastError: string | undefined;
  lastText: string | undefined;
  reason: string | undefined;
  ctxPercent: number | undefined;
  tokens: NotifyEvent["tokens"];
  filesTouched: string[] | undefined;
}

function activityCore(value: object, state: AgentState): Pick<PresenceActivityFields, "task" | "cost" | "lastError" | "lastText" | "reason"> {
  const costValue = property(value, "cost");
  const lastError = optionalString(property(value, "lastError"));
  const lastText = optionalString(property(value, "lastText"));
  const asking = property(value, "asking");
  const question = asking && typeof asking === "object" ? optionalString(property(asking, "question")) : undefined;
  const reason = state === "error" || state === "aborted" ? lastError : state === "blocked" ? question : undefined;
  return {
    task: eventTask(value),
    cost: typeof costValue === "number" ? costValue : undefined,
    lastError: lastError === undefined ? undefined : collapse(lastError),
    lastText: lastText === undefined ? undefined : collapse(lastText),
    reason: reason === undefined ? undefined : collapse(reason),
  };
}

function activityContext(value: object): Pick<PresenceActivityFields, "ctxPercent" | "tokens" | "filesTouched"> {
  const context = property(value, "context");
  const contextValue = context && typeof context === "object" ? property(context, "percent") : undefined;
  const filesValue = property(value, "filesTouched");
  const filesTouched = Array.isArray(filesValue) && filesValue.every((file) => typeof file === "string")
    ? filesValue
    : undefined;
  return {
    ctxPercent: typeof contextValue === "number" ? contextValue : undefined,
    tokens: eventTokens(value),
    filesTouched,
  };
}

function activityFields(value: object, state: AgentState): PresenceActivityFields {
  return { ...activityCore(value, state), ...activityContext(value) };
}

/** Derive one transition from a status file. First observations only seed state. */
export function derivePresenceTransition(
  orchDir: string,
  key: string,
  status: unknown,
  metadata: PresenceMetadata,
  states: Map<string, string>,
  now = new Date(),
): NotifyEvent | null {
  const transition = nextPresenceTransition(key, status, metadata.pid, states);
  if (!transition) return null;
  const value = statusObject(status);
  const identity = identityFields(orchDir, key, value, metadata);
  const activity = activityFields(value, transition.state);
  return {
    key,
    space: identity.space,
    agent: identity.agent,
    name: identity.name,
    dispatchId: identity.dispatchId,
    spawnedBy: identity.spawnedBy,
    spawnedByLabel: identity.spawnedByLabel,
    tab: identity.tab,
    model: identity.model,
    oldState: transition.previous,
    newState: transition.state,
    task: activity.task,
    cost: activity.cost,
    ts: now.toISOString(),
    lastError: activity.lastError,
    lastText: activity.lastText,
    reason: activity.reason,
    ctxPercent: activity.ctxPercent,
    tokens: activity.tokens,
    filesTouched: activity.filesTouched,
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

const TERMINAL_STATES = new Set(["done", "error", "aborted", "exited", "idle"]);

/** Build the durable run row from the status that produced a transition. */
function runRecordForTransition(
  orchDir: string,
  key: string,
  status: PresenceStatus,
  event: NotifyEvent,
  result: string | undefined,
): RunRecord | undefined {
  const dispatchId = event.dispatchId;
  if (!dispatchId) return undefined;

  // startedAt is optional in the presence protocol. A dispatch still gets a row
  // when it is absent; the transition timestamp is the daemon's observation of
  // when this run was first seen. upsertRun preserves an earlier value on update.
  const startedAt = typeof status.startedAt === "string" ? Date.parse(status.startedAt) : Date.parse(event.ts);
  const run: RunRecord = {
    dispatchId,
    agentKey: key,
    state: event.newState,
    startedAt,
  };
  // The harness is a fact of the agent's identity row, read through the composer.
  // Its SPACE is deliberately not copied here: A1 forbids a second table keeping
  // its own copy of a mutable environment fact, so a run reads it through the
  // agent whenever it is wanted.
  const agentId = tryParseIdentity(key)?.id;
  const view = agentId === undefined ? null : agentView(orchDir, agentId);
  if (view) run.adapter = view.harnessId;
  if (status.model && typeof status.model.id === "string") run.model = status.model.id;
  if (typeof status.task === "string") run.task = status.task;
  if (TERMINAL_STATES.has(event.newState) && typeof status.finishedAt === "string") {
    const finishedAt = Date.parse(status.finishedAt);
    if (Number.isFinite(finishedAt)) run.finishedAt = finishedAt;
  }
  if (typeof status.tokens?.input === "number") run.tokensIn = status.tokens.input;
  if (typeof status.tokens?.output === "number") run.tokensOut = status.tokens.output;
  if (typeof status.tokens?.cacheRead === "number") run.cacheRead = status.tokens.cacheRead;
  if (typeof status.tokens?.cacheWrite === "number") run.cacheWrite = status.tokens.cacheWrite;
  if (typeof status.cost === "number") run.cost = status.cost;
  if (typeof status.turns === "number") run.turns = status.turns;
  if (result !== undefined) run.result = result;
  if (typeof status.lastError === "string") run.lastError = status.lastError;
  return run;
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

  const closeWatcher = (key: string): void => {
    const watcher = watchers.get(key);
    if (!watcher) return;
    try {
      watcher.close();
      options.onWatcherClosed?.();
    } finally {
      watchers.delete(key);
    }
  };

  const check = (key: string): void => {
    if (stopped) return;
    const agentDir = presenceAgentDir(key, options.orchDir);
    try {
      if (!statSync(agentDir).isDirectory()) {
        closeWatcher(key);
        return;
      }
    } catch {
      closeWatcher(key);
      return;
    }
    const status = readPresenceStatus(join(agentDir, STATUS_FILE));
    const knownMetadata = options.keys?.get(key);
    const candidateState = statusState(status, knownMetadata?.pid);
    const previous = states.get(key);
    if (candidateState === undefined || candidateState === null || previous === candidateState) return;
    // Seed the initial observation without loading metadata: it is not a
    // transition and therefore cannot produce an event.
    if (previous === undefined) {
      derivePresenceTransition(options.orchDir, key, status, { name: null, tab: null }, states);
      return;
    }
    // Metadata may require database reads. Defer it until a real state transition
    // is observed; idle scans must not reload the spawned registry.
    const metadata = knownMetadata ?? options.metadataFor?.(key) ?? { name: null, tab: null };
    const event = derivePresenceTransition(options.orchDir, key, status, metadata, states);
    let resultText: string | undefined;
    if (event?.newState === "done") {
      const result = readJSON(join(presenceAgentDir(key, options.orchDir), RESULT_FILE));
      if (result && typeof result === "object") {
        const text = property(result, "text");
        if (typeof text === "string" && text.length > 0) {
          resultText = text;
          event.result = truncate(text, 2000);
        }
      }
    }
    if (event) {
      // History is a bystander: one broken store write must never stop the
      // presence watch from publishing the transition.
      try {
        if (status) {
          const run = runRecordForTransition(options.orchDir, key, status, event, resultText);
          if (run) upsertRun(options.orchDir, run);
        }
      } catch {
        // Keep watching even when the history store or its write is unavailable.
      }
      options.onEvent(event);
    }
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
      .filter((key) => options.acceptKey?.(key) ?? true);
  const scan = (): void => {
    // Snapshot delivered states, then arm every watcher before reconciliation.
    const lastSeen = new Map(states);
    const keys = selectedKeys();
    const selected = new Set(keys);
    for (const key of watchers.keys()) {
      if (!selected.has(key)) closeWatcher(key);
    }
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
      for (const key of [...watchers.keys()]) closeWatcher(key);
    },
    watcherCount: () => watchers.size,
  };
}

/** How many events this daemon has published for each agent. The publish point is the
 *  one place every event passes through, so the ordinal it stamps is unique per agent
 *  without any emitter having to know about the others. */
const published = new Map<string, number>();

/** How long an identical transition for one agent stays suppressed. Two processes
 *  briefly sharing one status file (a reset's old and new pi) re-derive the same
 *  transitions many times a minute; each repeat would be its own notification. */
const REPEAT_WINDOW_MS = 120_000;

/** When each (agent, transition-signature) pair was last published. */
const recentTransitions = new Map<string, number>();

/** True when this exact transition for this agent was already published inside
 *  the fixed suppression window. The window starts at the published event, so
 *  repeated observations cannot indefinitely hide a genuine later transition. */
export function isRepeatTransition(event: NotifyEvent, now = Date.now()): boolean {
  const signature = `${event.key}|${event.oldState}>${event.newState}|${event.dispatchId ?? ""}|${event.task ?? ""}`;
  const lastPublished = recentTransitions.get(signature);
  const repeated = lastPublished !== undefined && now - lastPublished < REPEAT_WINDOW_MS;
  if (!repeated) recentTransitions.set(signature, now);
  if (recentTransitions.size > 1_000) {
    for (const [key, at] of recentTransitions) if (now - at > REPEAT_WINDOW_MS) recentTransitions.delete(key);
  }
  return repeated;
}

/** Publish one event to the RPC stream and every configured sink, stamped with the
 *  agent name, transition ordinal, and live pack capacity that make it identifiable
 *  downstream. */
export function emitAndNotify(
  emit: (event: NotifyEvent) => void,
  sinks: NotifyEntry[],
  event: NotifyEvent,
  orchDir: string | undefined = undefined,
  now = Date.now(),
): void {
  if (isRepeatTransition(event, now)) return;
  const space = event.space ?? spaceLabelForKey(event.key);
  const seq = (published.get(event.key) ?? 0) + 1;
  published.set(event.key, seq);
  const named = event.agent?.trim() ? event : { ...event, agent: abstractAgentLabel(space, event.key), space };
  const capacity = orchDir === undefined
    ? event.capacity
    : (() => {
      const views = new Map(agentViews(orchDir).map((view) => [view.id, view]));
      const presence = loadPresence(orchDir);
      const view = views.get(event.key);
      const computed = computeFleetCapacity(views, presence, loadSettings(orchDir), { packRootId: view?.rootAgentId });
      return { packUsed: computed.pack.used, packCap: computed.pack.cap };
    })();
  const canonical: NotifyEvent = { ...named, seq, ...(capacity === undefined ? {} : { capacity }) };
  emit(canonical);
  notify(sinks, canonical);
}
