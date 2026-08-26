import { loadConfig, type OrchConfig } from "../config.ts";
import { buildEntities, currentWorkspace, resolveTarget, workspaceOf } from "../entities.ts";
import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { isRecord } from "../util.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { scopeToWorkspace, workspaceName } from "../policy/workspace.ts";
import { type PresenceMetadata } from "../daemon/events.ts";
import { subscribeEvents } from "../daemon/rpc.ts";
import { deliverToSink, loadSinks, type Sink } from "../notify/router.ts";
import { notificationText, type NotifyEvent } from "../notify/format.ts";
import { spawnerIdentity } from "../policy/spawner.ts";
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
  json: boolean;
  sinceSeq: number | undefined;
  once: boolean;
  mine: boolean;
  targets: string[];
}

interface EventsContext {
  options: EventsOptions;
  items: Map<string, WatchItem>;
  metadata: (key: string) => PresenceMetadata;
  accepts: (key: string, event?: NotifyEvent) => boolean;
  emit: (event: NotifyEvent, streamSeq: number) => boolean;
}


export async function cmdEvents(args: string[]) {
  const options = parseEventsOptions(args);
  await ensureDaemon(orchDir());
  const items = eventsItems(options);
  const mineAddress = options.mine ? spawnerIdentity().key ?? undefined : undefined;
  const accepts = (key: string, event?: NotifyEvent): boolean => {
    const inScope = options.targets.length
      ? items.has(key)
      : looksLikePaneKey(key)
        && scopeToWorkspace(orchDir(), [key], (item) => item, currentWorkspace(), { all: options.all }).length > 0;
    if (!inScope) return false;
    if (!options.mine) return true;
    const eventSpawnedBy = isRecord(event) && typeof event.spawnedBy === "string" ? event.spawnedBy : undefined;
    return eventSpawnedBy === mineAddress || spawnedRecords().get(key)?.spawnedBy === mineAddress;
  };
  const context: EventsContext = {
    options,
    items,
    metadata: presenceMetadata,
    accepts,
    emit: eventWriter(options, loadConfig(orchDir()).workspaces),
  };
  // Notification delivery is orchd's, not the client's: the daemon fans every
  // transition out to the sinks configured in settings.json whether or not
  // anyone is streaming. `orch events` only renders.
  const cleanup = startEventsTransport(context);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
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

/** The value of a `--flag=value` target, refused when empty so it cannot widen the stream. */
function namedTarget(argument: string, flag: string, usage: string): string {
  const value = argument.slice(flag.length).trim();
  if (!value) die(usage);
  return value;
}

export function parseEventsOptions(args: string[]): EventsOptions {
  let statusFilter: Set<string> | null = null;
  let all = false;
  // The norm is a readable line per transition that needs no jq to make sense of;
  // --json opts into the raw record for a caller that parses it.
  let json = false;
  let sinceSeq: number | undefined;
  let once = false;
  // An orchestrator watches the fleet it spawned. Every other session's agents are noise it
  // has no business acting on, so the spawner filter is the default and --any-agent lifts it.
  let mine = true;
  const targets: string[] = [];
  const usage = "usage: orch events [--agent=<name>] [--agent-id=<id>] [--any-agent] [--all] [--status s[,s...]] [--json] [--since-seq <n>] [--once]";
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--status") statusFilter = new Set((args[++index] ?? "").split(",").map((state) => state.trim()).filter(Boolean));
    else if (argument === "--all") all = true;
    else if (argument === "--json") json = true;
    else if (argument === "--since-seq") {
      const value = args[++index];
      const parsed = value === undefined ? Number.NaN : Number(value);
      if (!Number.isSafeInteger(parsed)) die(usage);
      sinceSeq = parsed;
    } else if (argument === "--once") once = true;
    else if (argument === "--any-agent") mine = false;
    else if (argument.startsWith("--agent=")) targets.push(namedTarget(argument, "--agent=", usage));
    else if (argument.startsWith("--agent-id=")) targets.push(namedTarget(argument, "--agent-id=", usage));
    else targets.push(argument);
  }
  return { statusFilter, all, json, sinceSeq, once, mine, targets };
}

function presenceMetadata(key: string): PresenceMetadata {
  const entity = buildEntities().find((candidate) => candidate.presence?.key === key || candidate.key === key);
  return { name: entity?.name ?? null, tab: entity?.tabLabel ?? null, pid: entity?.presence?.status?.pid };
}

function eventsItems(options: EventsOptions): Map<string, WatchItem> {
  const items = new Map<string, WatchItem>();
  if (!options.targets.length) {
    const presences = scopeToWorkspace(
      orchDir(),
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

export function formatEventGap(oldestSeq: number): string {
  return `warning: event history gap; events before sequence ${oldestSeq} were pruned (replay resumes at sequence ${oldestSeq})\n`;
}

function eventWriter(options: EventsOptions, resolver: OrchConfig["workspaces"]): (event: NotifyEvent, streamSeq: number) => boolean {
  return (event, streamSeq): boolean => {
    if (options.statusFilter && !options.statusFilter.has(event.newState)) return false;
    const id = event.workspace ?? workspaceOf(orchDir(), event.key);
    const label = workspaceName(id, resolver);
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ ...event, workspaceName: label, streamSeq })}\n`);
      return true;
    }
    const rawTitle = notificationText(event, { colorize: true }).title;
    const title = label && id && label !== id ? rawTitle.replace(`[${id}]`, `[${label} (${id})]`) : rawTitle;
    const transition = `  ${event.oldState}->${event.newState}`;
    const cost = typeof event.cost === "number" ? `  $${event.cost.toFixed(2)}` : "";
    process.stdout.write(`${title}${transition}${cost}\n`);
    return true;
  };
}

/**
 * The daemon is the only event source, and this subscription outlives it: a
 * daemon restart drops the socket, the subscriber redials with backoff and
 * replays what the new instance still holds. One subscription covers the whole
 * session, so an orchestrator never has to poll `orch status` to notice a
 * worker went blocked.
 */
function startEventsTransport(context: EventsContext): () => void {
  const subscription = subscribeEvents(
    orchDir(),
    context.options.sinceSeq === undefined ? {} : { since: context.options.sinceSeq },
    (value, streamSeq) => {
      if (!isNotifyEvent(value) || !context.accepts(value.key, value)) return;
      if (context.emit(value, streamSeq) && context.options.once) {
        subscription.close();
        process.exit(0);
      }
    },
    (oldestSeq) => process.stderr.write(formatEventGap(oldestSeq)),
  );
  return () => subscription.close();
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

