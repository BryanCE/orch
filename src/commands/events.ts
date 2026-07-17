import { loadConfig, watchConfig, type OrchConfig } from "../config.ts";
import { buildEntities, currentWorkspace, resolveTarget, workspaceOf } from "../entities.ts";
import { loadPresence, orchDir } from "../store.ts";
import { isRecord } from "../store.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { resolveBackend } from "../backends/registry.ts";
import { scopeToWorkspace, workspaceName } from "../policy/workspace.ts";
import { derivePresenceTransition, startPreferredEvents, startPresenceWatch, type PresenceMetadata, type PresenceWatch } from "../daemon/events.ts";
import { deliverToSink, loadSinks, notify, notificationText, type NotifyEvent, type Sink } from "../notify.ts";
import { ensureDaemon } from "./daemon.ts";
import { die } from "./target.ts";

interface WatchItem {
  key: string;
  dir: string;
  name: string | null;
  tab: string | null;
  pid: number | undefined;
}

function looksLikePaneKey(key: string): boolean {
  return tryParseIdentity(key) !== null;
}

interface EventsOptions {
  statusFilter: Set<string> | null;
  all: boolean;
  notifications: boolean;
  json: boolean;
  offline: boolean;
  targets: string[];
}

interface EventsContext {
  options: EventsOptions;
  items: Map<string, WatchItem>;
  states: Map<string, string>;
  sinks: Sink[];
  metadata: (key: string) => PresenceMetadata;
  accepts: (key: string) => boolean;
  emit: (event: NotifyEvent) => void;
}


export async function cmdEvents(args: string[]) {
  const options = parseEventsOptions(args);
  if (!options.offline) await ensureDaemon(orchDir());
  const items = eventsItems(options);
  const accepts = (key: string): boolean => {
    if (options.targets.length) return items.has(key);
    if (!looksLikePaneKey(key)) return false;
    return scopeToWorkspace([key], (item) => item, currentWorkspace(), { all: options.all }).length > 0;
  };
  const context: EventsContext = {
    options,
    items,
    states: new Map<string, string>(),
    sinks: eventsSinks(options.notifications),
    metadata: presenceMetadata,
    accepts,
    emit: eventWriter(options, loadConfig(orchDir()).workspaces),
  };
  seedEventStates(context);
  // Live-reload notify sinks on settings.json edits; invalid JSON keeps the
  // last-good sinks and warns once per bad state (settings-json-config 6.4).
  const configWatch = options.notifications
    ? watchConfig(orchDir(), () => { context.sinks = eventsSinks(true); }, (message) => process.stderr.write(`settings.json: ${message}\n`))
    : null;
  const cleanup = await startEventsTransport(context);
  process.on("SIGINT", () => { configWatch?.stop(); cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { configWatch?.stop(); cleanup(); process.exit(0); });
}

export async function cmdNotify(args: string[]) {
  const json = args.includes("--json");
  const cleanArgs = args.filter((arg) => arg !== "--json");
  if (cleanArgs[0] !== "test") die("usage: orch notify test [--state <state>] [--json]");
  let state = "blocked";
  for (let i = 1; i < cleanArgs.length; i++) {
    if (cleanArgs[i] === "--state") state = cleanArgs[++i] ?? "";
    else die("usage: orch notify test [--state <state>] [--json]");
  }
  if (!state) die("usage: orch notify test [--state <state>] [--json]");
  const event: NotifyEvent = {
    key: "test:notify",
    agent: "notify-test",
    tab: "notify",
    model: "test:medium",
    oldState: "working",
    newState: state,
    task: "orch notify test",
    ts: new Date().toISOString(),
  };
  const sinks = loadSinks(orchDir());
  if (!sinks.length) {
    process.stderr.write("notify test: no sinks configured\n");
    process.exitCode = 1;
    return;
  }
  const results = await Promise.all(sinks.map(async (sink) => ({ sink, ok: await deliverToSink(sink, event) })));
  if (json) process.stdout.write(JSON.stringify(results.map(({ sink, ok }) => ({ sink: sinkLabel(sink), ok }))) + "\n");
  else for (const { sink, ok } of results) process.stdout.write(`notify ${sinkLabel(sink)}: ${ok ? "ok" : "fail"}\n`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

export function parseEventsOptions(args: string[]): EventsOptions {
  let statusFilter: Set<string> | null = null;
  let all = false;
  let notifications = false;
  let json = false;
  let offline = false;
  const targets: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--status") statusFilter = new Set((args[++index] ?? "").split(",").map((state) => state.trim()).filter(Boolean));
    else if (argument === "--all") all = true;
    else if (argument === "--notify") notifications = true;
    else if (argument === "--json") json = true;
    else if (argument === "--offline") offline = true;
    else targets.push(argument);
  }
  return { statusFilter, all, notifications, json, offline, targets };
}

export function eventsSinks(enabled: boolean): Sink[] {
  if (!enabled) return [];
  const backend = resolveBackend({ configured: loadConfig(orchDir()).defaults.backend ?? null });
  const available = backend.isAvailable() && backend.isInsideSession();
  const sinks = loadSinks(orchDir()).filter((sink) => sink.type !== backend.id || available);
  if (available && !sinks.some((sink) => sink.type === backend.id)) {
    sinks.push({ type: backend.id, on: ["blocked", "error"] });
  }
  if (!sinks.length) process.stderr.write("notify: no sinks configured\n");
  return sinks;
}

export function presenceMetadata(key: string): PresenceMetadata {
  const entity = buildEntities().find((candidate) => candidate.presence?.key === key || candidate.key === key);
  return { name: entity?.name ?? null, tab: entity?.tabLabel ?? null, pid: entity?.presence?.status?.pid };
}

export function eventsItems(options: EventsOptions): Map<string, WatchItem> {
  const items = new Map<string, WatchItem>();
  if (!options.targets.length) {
    const presences = scopeToWorkspace(
      [...loadPresence().values()].filter((presence) => presence.alive && looksLikePaneKey(presence.key)),
      (presence) => presence.key,
      currentWorkspace(),
      { all: options.all },
    );
    for (const presence of presences) {
      const metadata = presenceMetadata(presence.key);
      items.set(presence.key, {
        key: presence.key,
        dir: presence.dir,
        name: metadata.name,
        tab: metadata.tab,
        pid: metadata.pid,
      });
    }
  }
  for (const target of options.targets) {
    const entity = resolveTarget(target, { all: options.all });
    if (!entity.presence) die(`Target "${target}" has no agent dir to watch.`);
    items.set(entity.presence.key, {
      key: entity.presence.key,
      dir: entity.presence.dir,
      name: entity.name,
      tab: entity.tabLabel,
      pid: entity.presence.status?.pid,
    });
  }
  if (!items.size && !options.all) die("No live pane agent dirs to stream.");
  return items;
}

export function eventWriter(options: EventsOptions, resolver: OrchConfig["workspaces"]): (event: NotifyEvent) => void {
  return (event): void => {
    if (options.statusFilter && !options.statusFilter.has(event.newState)) return;
    const id = event.workspace ?? workspaceOf(event.key);
    const label = workspaceName(id, resolver);
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ ...event, workspaceName: label })}\n`);
      return;
    }
    const rawTitle = notificationText(event, { colorize: true }).title;
    const title = label && id && label !== id ? rawTitle.replace(`[${id}]`, `[${label} (${id})]`) : rawTitle;
    const transition = `  ${event.oldState}→${event.newState}`;
    const cost = typeof event.cost === "number" ? `  $${event.cost.toFixed(2)}` : "";
    process.stdout.write(`${title}${transition}${cost}\n`);
  };
}

export function seedEventStates(context: EventsContext): void {
  for (const presence of loadPresence().values()) {
    if (!context.accepts(presence.key)) continue;
    derivePresenceTransition(presence.key, presence.status, context.metadata(presence.key), context.states);
  }
}

export async function startEventsTransport(context: EventsContext): Promise<() => void> {
  let fileWatch: PresenceWatch | undefined;
  const startFiles = (): void => {
    if (fileWatch) return;
    const keys = context.options.all
      ? undefined
      : new Map([...context.items].map(([key, item]) => [key, { name: item.name, tab: item.tab, pid: item.pid }]));
    fileWatch = startPresenceWatch({
      orchDir: orchDir(),
      initialStates: context.states,
      keys,
      acceptKey: context.accepts,
      metadataFor: context.metadata,
      onEvent: (event) => {
        if (context.options.notifications) notify(context.sinks, event);
        context.emit(event);
      },
    });
  };
  if (context.options.offline) {
    startFiles();
    return () => fileWatch?.stop();
  }
  const preferred = await startPreferredEvents({
    orchDir: orchDir(),
    onEvent: (value) => {
      if (!isNotifyEvent(value) || !context.accepts(value.key)) return;
      context.states.set(value.key, value.newState);
      context.emit(value);
    },
    onDisconnect: () => process.stderr.write("orch events: daemon disconnected; use --offline for file diagnostics\n"),
    onFallback: () => die("orch events: daemon unavailable; use --offline for read-only file diagnostics."),
  });
  return () => {
    preferred.stop();
    fileWatch?.stop();
  };
}

export function isNotifyEvent(value: unknown): value is NotifyEvent {
  return isRecord(value)
    && typeof value.key === "string"
    && typeof value.oldState === "string"
    && typeof value.newState === "string"
    && typeof value.ts === "string";
}

export function sinkLabel(sink: Sink): string {
  if (sink.type === "webhook") {
    const url = sink.url;
    return `webhook ${typeof url === "string" ? url : ""}`;
  }
  if (sink.type === "command") {
    const command = sink.command;
    return `command ${Array.isArray(command) ? command.map((part) => String(part)).join(" ") : ""}`;
  }
  return sink.type;
}

