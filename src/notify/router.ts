import { loadConfigOrNull, SETTINGS_DEFAULTS, type NotifyEntry } from "../config.ts";
import {
  allSinkProviders,
  commandAvailable,
  createBuiltinNotifiers,
  hasSinkProvider,
  onSinkProviderRegistered,
  providerNotifier,
  stringArray,
  type Notifier,
} from "./sinks.ts";
import { oneLine, type NotifyEvent } from "./format.ts";

/** A configured notifier entry, normalized for delivery. */
export interface NotifierEntry {
  id: string;
  on: readonly string[];
  config: Record<string, unknown>;
  timeoutMs?: number;
};

export interface DesktopSink { type: "desktop"; on: readonly string[]; timeoutMs?: number }
export interface WebhookSink { type: "webhook"; on: readonly string[]; url: string; timeoutMs?: number }
export interface CommandSink { type: "command"; on: readonly string[]; command: string | string[]; timeoutMs?: number }
export interface RegisteredSink { type: string; on: readonly string[]; timeoutMs?: number; [key: string]: unknown }
export type Sink = DesktopSink | WebhookSink | CommandSink | RegisteredSink;

function warning(message: string): void {
  process.stderr.write(`notify: ${message}\n`);
}

/** Read configured notifier entries. Each names its sink with `id`. */
function loadNotifierEntries(orchDir: string): NotifierEntry[] {
  try {
    const config = loadConfigOrNull(orchDir);
    return (config?.notify ?? []).flatMap((entry: NotifyEntry) => {
      if (!isRegisteredSink(entry.id)) {
        warning(`invalid notify entry: unknown sink type ${JSON.stringify(entry.id)}`);
        return [];
      }
      const on = entry.on ?? ["blocked", "error"];
      const value = { ...entry } as Record<string, unknown>;
      delete value.id;
      delete value.on;
      return [{ id: entry.id, on, config: value, timeoutMs: config?.timeouts.notify_ms }];
    });
  } catch (error) {
    warning(`could not load settings.json: ${oneLine(error)}`);
    return [];
  }
}

/** Load valid sink declarations from the settings.json `notify` array. */
export function loadSinks(orchDir: string): Sink[] {
  return loadNotifierEntries(orchDir).map((entry): Sink => {
    if (entry.id === "desktop") return { type: entry.id, on: entry.on };
    if (entry.id === "webhook") return { type: "webhook", on: entry.on, url: entry.config.url as string, timeoutMs: entry.timeoutMs };
    if (entry.id === "command") return { type: "command", on: entry.on, command: entry.config.command as string | string[], timeoutMs: entry.timeoutMs };
    return { type: entry.id, on: entry.on, timeoutMs: entry.timeoutMs };
  });
}

function isRegisteredSink(id: string): boolean {
  return id === "desktop" || id === "webhook" || id === "command" || hasSinkProvider(id);
}

const builtinNotifiers = createBuiltinNotifiers();

function entryFromSink(sink: Sink): NotifierEntry {
  // RegisteredSink's string discriminant defeats union narrowing; gate on the property instead.
  if (sink.type === "webhook" && "url" in sink) return { id: sink.type, on: sink.on, config: { url: sink.url }, timeoutMs: sink.timeoutMs };
  if (sink.type === "command" && "command" in sink) return { id: sink.type, on: sink.on, config: { command: sink.command }, timeoutMs: sink.timeoutMs };
  return { id: sink.type, on: sink.on, config: {}, timeoutMs: sink.timeoutMs };
}

function timeoutResult<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(undefined); });
  });
}

interface AvailabilityResult { available: boolean; reason?: string; error?: string }

/** Registry for probing, validating, and isolating configured notifier deliveries. */
class NotifierRegistry {
  private readonly notifiers = new Map<string, Notifier>();
  private readonly emitWarning: (message: string) => void;
  readonly timeoutMs: number;

  constructor(notifiers: readonly Notifier[] = builtinNotifiers, options: { timeoutMs?: number; warn?: (message: string) => void } = {}) {
    this.timeoutMs = options.timeoutMs ?? SETTINGS_DEFAULTS.timeouts.notify_ms;
    this.emitWarning = options.warn ?? ((message) => warning(message));
    for (const notifier of notifiers) this.register(notifier);
  }

  register(notifier: Notifier): this {
    this.notifiers.set(notifier.id, notifier);
    return this;
  }

  get(id: string): Notifier | undefined { return this.notifiers.get(id); }
  list(): Notifier[] { return [...this.notifiers.values()]; }

  validate(id: string, config: Record<string, unknown>): string[] {
    const notifier = this.notifiers.get(id);
    if (!notifier) return [`unknown notifier: ${id}`];
    return notifier.metadata.requiredConfig.flatMap((field) => {
      const name = typeof field === "string" ? field : field.name;
      const value = config[name];
      if (name === "command" ? !stringArray(value)?.length : typeof value !== "string" || !value.trim()) {
        return [`${id} requires ${name}`];
      }
      return [];
    });
  }

  /** Probe all integrations, or one integration with its configured metadata. */
  async probe(): Promise<Record<string, boolean>>;
  async probe(id: string, config?: Record<string, unknown>): Promise<AvailabilityResult>;
  async probe(id?: string, config: Record<string, unknown> = {}): Promise<Record<string, boolean> | AvailabilityResult> {
    if (id !== undefined) {
      const notifier = this.notifiers.get(id);
      if (!notifier) return { available: false, reason: "unknown notifier" };
      const errors = this.validate(id, config);
      if (errors.length) return { available: false, reason: errors.join("; ") };
      try {
        if (id === "command" && !commandAvailable(config)) return { available: false, reason: "configured command is not on PATH" };
        return (await notifier.available(config)) ? { available: true } : { available: false, reason: "host integration unavailable" };
      } catch (error) {
        return { available: false, error: oneLine(error) };
      }
    }
    const result: Record<string, boolean> = {};
    await Promise.all(this.list().map(async (notifier) => {
      try { result[notifier.id] = await notifier.available(); } catch { result[notifier.id] = false; }
    }));
    return result;
  }

  /** Alias used by setup/doctor callers. */
  probeAvailability(): Promise<Record<string, boolean>>;
  probeAvailability(id: string, config?: Record<string, unknown>): Promise<AvailabilityResult>;
  probeAvailability(id?: string, config: Record<string, unknown> = {}): Promise<Record<string, boolean> | AvailabilityResult> {
    return id === undefined ? this.probe() : this.probe(id, config);
  }

  async deliverEntry(entry: NotifierEntry, event: NotifyEvent, checkAvailability = true): Promise<boolean> {
    if (!entry.on.includes(event.newState)) return true;
    const notifier = this.notifiers.get(entry.id);
    if (!notifier) { this.emitWarning(`${entry.id} notifier is not registered`); return false; }
    const deliveryConfig = entry.id === "command" && typeof entry.config.command === "string"
      ? { ...entry.config, command: ["sh", "-c", entry.config.command] }
      : entry.config;
    if (this.validate(entry.id, deliveryConfig).length) { this.emitWarning(`${entry.id} notifier has invalid configuration`); return false; }
    if (checkAvailability) {
      try {
        // A command's availability depends on its configured executable, not just the
        // shell used by the adapter. Keep this check in the registry so custom
        // Notifier implementations retain the phase-1 boolean probe contract.
        if (entry.id === "command" && !commandAvailable(deliveryConfig)) {
          this.emitWarning(`${entry.id} notifier unavailable`);
          return false;
        }
        if (!(await notifier.available(deliveryConfig))) { this.emitWarning(`${entry.id} notifier unavailable`); return false; }
      } catch { this.emitWarning(`${entry.id} notifier unavailable`); return false; }
    }
    const result = await timeoutResult(Promise.resolve().then(() => notifier.deliver(event, deliveryConfig)), entry.timeoutMs ?? this.timeoutMs);
    if (result !== true) { this.emitWarning(`${entry.id} sink failed`); return false; }
    return true;
  }

  /** Deliver configured entries, or one id/config/event tuple for adapter callers. */
  async deliver(event: NotifyEvent, entries: readonly (NotifierEntry | Sink)[]): Promise<boolean[]>;
  async deliver(id: string, config: Record<string, unknown>, event: NotifyEvent): Promise<boolean>;
  async deliver(eventOrId: NotifyEvent | string, entriesOrConfig: readonly (NotifierEntry | Sink)[] | Record<string, unknown>, maybeEvent?: NotifyEvent): Promise<boolean[] | boolean> {
    if (typeof eventOrId === "string") {
      if (!maybeEvent) return false;
      return this.deliverEntry({ id: eventOrId, on: [maybeEvent.newState], config: entriesOrConfig as Record<string, unknown> }, maybeEvent, true);
    }
    const entries = entriesOrConfig as readonly (NotifierEntry | Sink)[];
    return Promise.all(entries.map((entry) => this.deliverEntry("type" in entry ? entryFromSink(entry) : entry, eventOrId, true)));
  }

  /** Queue best-effort delivery without delaying or throwing into producers. */
  notify(event: NotifyEvent, entries: readonly (NotifierEntry | Sink)[]): void {
    for (const entry of entries) {
      const configured = "type" in entry ? entryFromSink(entry) : entry;
      if (!configured.on.includes(event.newState)) continue;
      queueMicrotask(() => { void this.deliverEntry(configured, event, true); });
    }
  }
}

export function createNotifierRegistry(notifiers?: readonly Notifier[], options: { timeoutMs?: number; warn?: (message: string) => void } = {}): NotifierRegistry {
  // Providers can register during a backend import after the initial built-ins
  // were created. Include them in the default registry without importing any
  // backend here.
  const defaults = notifiers ?? [
    ...builtinNotifiers,
    ...allSinkProviders()
      .filter((provider) => !builtinNotifiers.some((notifier) => notifier.id === provider.id))
      .map(providerNotifier),
  ];
  return new NotifierRegistry(defaults, options);
}

const notifierRegistry: NotifierRegistry = createNotifierRegistry();
// Providers that register after this module initialized still reach the default registry.
onSinkProviderRegistered((provider) => notifierRegistry.register(providerNotifier(provider)));

export async function deliverToSink(sink: Sink, event: NotifyEvent): Promise<boolean> {
  const configured = entryFromSink(sink);
  // Preserve the direct sink API: it reports the adapter outcome and does not probe first.
  return notifierRegistry.deliverEntry(configured, event, false);
}

/** Queue best-effort sink delivery without delaying or throwing into the caller. */
export function notify(entries: readonly (Sink | NotifierEntry)[], event: NotifyEvent): void {
  notifierRegistry.notify(event, entries);
}
