import { loadConfigOrNull, NOTIFY_DEFAULT_ON, NOTIFY_IDS, SETTINGS_DEFAULTS } from "../config.ts";
import { commandAvailable, createBuiltinNotifiers, stringArray } from "./sinks.ts";
import { oneLine } from "./format.ts";
import { AGENT_STATES, type AgentState } from "../adapters/adapter.ts";
import type { Notifier, NotifyEvent } from "../types/notify.ts";
import type { NotifyEntry } from "../types/config.ts";
import { orchDir } from "../presence/store.ts";
import { decisionLogger } from "../daemon/decision-log.ts";

function warning(message: string): void { decisionLogger(orchDir()).warn("notify.failed", { message }); }

/** The sink ids are the discriminants config.ts's `NotifyEntrySchema` already
 *  declares. Re-listing them here made a second copy that could drift, and put a
 *  plexer name in core where Rule 10 forbids it. */
function isNotifyId(value: string): value is NotifyEntry["id"] {
  return NOTIFY_IDS.includes(value);
}

function statesFor(entry: NotifyEntry): readonly AgentState[] { return entry.on ?? NOTIFY_DEFAULT_ON; }
function eventState(event: NotifyEvent): AgentState | undefined { return AGENT_STATES.find((state) => state === event.newState); }

function configFor(entry: NotifyEntry): Record<string, unknown> {
  if (entry.id === "webhook") return { url: entry.url };
  if (entry.id === "command") return { command: typeof entry.command === "string" ? ["sh", "-c", entry.command] : entry.command };
  return {};
}

export function loadNotifierEntries(orchDir: string): NotifyEntry[] {
  try {
    return loadConfigOrNull(orchDir)?.notify ?? [];
  } catch (error: unknown) {
    warning(`could not load settings.json: ${oneLine(error)}`);
    return [];
  }
}

class NotifierRegistry {
  private readonly notifiers: Map<NotifyEntry["id"], Notifier>;
  private readonly emitWarning: (message: string) => void;
  readonly timeoutMs: number;

  constructor(notifiers: readonly Notifier[] = createBuiltinNotifiers(), options: { timeoutMs?: number; warn?: (message: string) => void } = {}) {
    this.timeoutMs = options.timeoutMs ?? SETTINGS_DEFAULTS.timeouts.notify_ms;
    this.emitWarning = options.warn ?? warning;
    this.notifiers = new Map(notifiers.flatMap((notifier) => isNotifyId(notifier.id) ? [[notifier.id, notifier]] : []));
  }

  async deliver(entry: NotifyEntry, event: NotifyEvent): Promise<boolean> {
    const state = eventState(event);
    if (state === undefined || !statesFor(entry).includes(state)) return true;
    const notifier = this.notifiers.get(entry.id);
    if (!notifier) { this.emitWarning(`${entry.id} notifier is not registered`); return false; }
    const config = configFor(entry);
    const errors = notifier.metadata.requiredConfig.flatMap((field) => {
      const name = field.name;
      const value = config[name];
      return name === "command" ? (stringArray(value)?.length ? [] : [`${entry.id} requires ${name}`]) : (typeof value === "string" && value.trim() ? [] : [`${entry.id} requires ${name}`]);
    });
    if (errors.length) { this.emitWarning(errors.join("; ")); return false; }
    // TASKS/07: "Send throws real errors." A delivery failure reaches the caller
    // unchanged; it is never converted to `false`.
    if (entry.id === "command" && !commandAvailable(config)) return false;
    if (!(await notifier.available(config))) return false;
    return await notifier.deliver(event, config);
  }

  validate(entry: NotifyEntry): string[] {
    const notifier = this.notifiers.get(entry.id);
    if (!notifier) return [`unknown notifier: ${entry.id}`];
    const config = configFor(entry);
    return notifier.metadata.requiredConfig.flatMap((field) => {
      const name = field.name;
      const value = config[name];
      return name === "command" ? (stringArray(value)?.length ? [] : [`${entry.id} requires ${name}`]) : (typeof value === "string" && value.trim() ? [] : [`${entry.id} requires ${name}`]);
    });
  }

  notifierFor(entry: NotifyEntry): Notifier | undefined { return this.notifiers.get(entry.id); }

  async reachable(entry: NotifyEntry): Promise<{ available: boolean; reason?: string; error?: string }> {
    const errors = this.validate(entry);
    if (errors.length) return { available: false, reason: errors.join("; ") };
    const notifier = this.notifiers.get(entry.id);
    if (!notifier) return { available: false, reason: "unknown notifier" };
    const config = configFor(entry);
    try {
      if (entry.id === "command" && !commandAvailable(config)) return { available: false, reason: "configured command is not on PATH" };
      return await notifier.available(config) ? { available: true } : { available: false, reason: "host integration unavailable" };
    } catch (error: unknown) { return { available: false, error: oneLine(error) }; }
  }

  async deliverAll(entries: readonly NotifyEntry[], event: NotifyEvent): Promise<boolean[]> {
    return Promise.all(entries.map((entry) => this.deliver(entry, event)));
  }

  notify(entries: readonly NotifyEntry[], event: NotifyEvent): void {
    for (const entry of entries) {
      const state = eventState(event);
      if (state === undefined || !statesFor(entry).includes(state)) continue;
      queueMicrotask(() => { void this.deliver(entry, event); });
    }
  }
}

export function createNotifierRegistry(notifiers?: readonly Notifier[], options: { timeoutMs?: number; warn?: (message: string) => void } = {}): NotifierRegistry {
  return new NotifierRegistry(notifiers, options);
}

const notifierRegistry = createNotifierRegistry();

export async function deliver(entry: NotifyEntry, event: NotifyEvent): Promise<boolean> {
  return notifierRegistry.deliver(entry, event);
}

export function notify(entries: readonly NotifyEntry[], event: NotifyEvent): void {
  notifierRegistry.notify(entries, event);
}
