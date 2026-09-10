import { loadSettings } from "../settings/read.ts";
import { buildEntities, resolveTarget, spaceOf } from "../entities.ts";
import { callerSpace } from "../identity/self.ts";
import { scopeToSpace, withinSpaceCeiling } from "../policy/space.ts";
import { agentInMineScope, agentInScope, resolveCallerScope } from "../policy/scope.ts";
import { loadPresence, spawnedRecords } from "../presence/store.ts";
import { orchDir } from "../presence/writer.ts";
import { isRecord } from "../util.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { subscribeEvents } from "../daemon/rpc/client.ts";
import { ensureDaemon } from "../daemon/reach.ts";
import { deliver } from "../notify/router.ts";
import { notificationText } from "../notify/format.ts";
import { currentLease } from "../store/lease-rows.ts";
import { die } from "./target.ts";
import { commandLogger } from "./logging.ts";
import type { PresenceMetadata } from "../types/daemon.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { NotifyEntry } from "../types/settings.ts";
import type { CallerScopeChoice, ResolvedCallerScope } from "../types/policy.ts";

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

export interface EventsOptions {
  json: boolean;
  sinceSeq: number | undefined;
  once: boolean;
  scope: CallerScopeChoice;
  /** States the caller narrowed to, or null for every state — which is the default. */
  filter: Set<string> | null;
  targets: string[];
}

interface EventsContext {
  options: EventsOptions;
  items: Map<string, WatchItem>;
  metadata: (key: string) => PresenceMetadata;
  accepts: (key: string) => boolean;
  emit: (event: NotifyEvent, streamSeq: number) => boolean;
}

/**
 * The wall for a streamed transition, asked exactly as `orch status` asks it of a row.
 *
 * A1 / Rule 11: the space is an ENVIRONMENT axis read through {@link spaceOf}, never
 * a segment sliced out of the identity key. Reading it out of the key pinned the
 * stream to the space the agent was BORN in, so a moved or adopted agent kept
 * appearing in a space it had left and vanished from the one it occupies.
 */
export function eventWithinSpaceWall(root: string, key: string, ceiling: string | null): boolean {
  return withinSpaceCeiling(spaceOf(root, key), ceiling);
}

export async function cmdEvents(args: string[]) {
  const options = parseEventsOptions(args);
  await ensureDaemon(orchDir());
  const items = eventsItems(options);
  const scope = await resolveCallerScope(options.scope, orchDir());
  const accepts = (key: string): boolean => {
    // The key IS the minted id (A1), so there is one lookup and no second id space.
    const agentId = tryParseIdentity(key)?.id ?? null;
    const inScope = options.targets.length
      ? items.has(key)
      : agentId !== null && eventWithinSpaceWall(orchDir(), agentId, callerSpace());
    if (!inScope) return false;
    const leaseOwner = currentLease(orchDir(), agentId ?? key)?.orchId ?? null;
    return agentInScope({
      spaceWide: !scope.mine,
      mineAddress: scope.address,
      leaseOwner,
      recordSpawnedBy: spawnedRecords().get(agentId ?? key)?.spawnedBy ?? undefined,
    });
  };
  const context: EventsContext = {
    options,
    items,
    metadata: presenceMetadata,
    accepts,
    emit: eventWriter(options),
  };
  // Notification delivery is orchd's, not the client's: the daemon fans every
  // transition out to the sinks configured in settings.json whether or not
  // anyone is streaming. `orch events` only renders.
  const cleanup = startEventsLiveStream(options, scope, {
    writeNotice: (line) => process.stdout.write(line),
    startTransport: () => startEventsTransport(context),
  });
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
  const sinks = loadSettings(orchDir()).notify;
  if (!sinks.length) {
    commandLogger().error("notify.test.no-sinks", { sinkCount: 0 });
    process.stdout.write("notify test: no sinks configured\n");
    process.exitCode = 1;
    return;
  }
  const results = await Promise.all(sinks.map(async (sink) => ({ sink, ok: await deliver(sink, event) })));
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

export interface EventsLiveStreamPorts {
  writeNotice: (line: string) => void;
  startTransport: () => () => void;
  /** Whether stdout is a terminal, so the banner reaches a person rather than a parser. */
  toTerminal?: boolean;
  /** How many agents the caller owns. Injected like every other fact this
   *  function needs, so the store stays out of the stream's setup. */
  ownedAgents?: () => number;
}

export function startEventsLiveStream(options: EventsOptions, scope: ResolvedCallerScope, ports: EventsLiveStreamPorts): () => void {
  // Ahead of the banner, and never suppressed: a parser and a person are equally
  // misled by a stream that cannot fire, and the harness reading it is the one
  // that will sit on it for an hour.
  const owned = ports.ownedAgents?.() ?? ownedAgentCount(scope);
  if (!options.json && owned === 0) ports.writeNotice(emptyScopeNotice());
  const notice = eventsScopeNotice(options, scope, ports.toTerminal);
  if (notice !== null) ports.writeNotice(`${notice}\n`);
  return ports.startTransport();
}

/**
 * The agents this caller owns right now — everything its stream can carry.
 *
 * Zero is the case that reads as a broken daemon: a session that has spawned
 * nothing owns nothing, so a watch armed before the first spawn is silence by
 * construction, and a monitor sat on it for three minutes saying nothing.
 */
export function ownedAgentCount(scope: ResolvedCallerScope, root = orchDir()): number {
  if (!scope.mine || scope.address === undefined) return 0;
  let owned = 0;
  for (const [agentId, record] of spawnedRecords(root)) {
    const leaseOwner = currentLease(root, agentId)?.orchId ?? null;
    if (agentInMineScope({ mineAddress: scope.address, leaseOwner, recordSpawnedBy: record.spawnedBy ?? undefined })) owned += 1;
  }
  return owned;
}

/** What a caller owning nothing is told, in place of an empty stream. */
export function emptyScopeNotice(): string {
  return "orch events: you own no agents, so nothing can arrive on this stream yet."
    + " It covers whatever you spawn or dispatch to from here on; --space-wide watches the rest of your space now.\n";
}

export function eventsScopeNotice(
  options: EventsOptions,
  scope: ResolvedCallerScope,
  toTerminal: boolean = process.stdout.isTTY === true,
): string | null {
  if (options.sinceSeq !== undefined || options.targets.length > 0) return null;
  // The notice is for a PERSON watching. json means a parser is reading stdout, and a
  // redirected stream means a harness is: there the banner is one more line to wake up
  // for, on a stream whose every other line is a real transition.
  if (options.json || !toTerminal) return null;
  return scope.mine
    ? "watching my agents from now on"
    : "watching all agents from now on";
}

const EVENTS_USAGE = "usage: orch events [--agent=<name>] [--agent-id=<id>] [--space-wide] [--filter=<state,...>] [--json] [--since-seq <n>] [--once]";

/** `--since-seq <n>`, or a refusal: a replay point that is not an integer names no event. */
function readSinceSeq(value: string | undefined): number {
  const parsed = value === undefined ? Number.NaN : Number(value);
  if (!Number.isSafeInteger(parsed)) die(EVENTS_USAGE);
  return parsed;
}

/** `--filter=done,error`, or a refusal: an empty list narrows to nothing and would
 *  arm a watch that can never fire. */
function readStateFilter(value: string): Set<string> {
  const states = value.split(",").map((state) => state.trim()).filter((state) => state.length > 0);
  if (states.length === 0) die(EVENTS_USAGE);
  return new Set(states);
}

/** Read one flag into `options`, and say how many arguments it consumed after itself. */
function readEventsFlag(options: EventsOptions, args: string[], index: number): number {
  const argument = args[index]!;
  switch (argument) {
    case "--since-seq": options.sinceSeq = readSinceSeq(args[index + 1]); return 1;
    case "--json": options.json = true; return 0;
    case "--once": options.once = true; return 0;
    case "--space-wide": options.scope = "any"; return 0;
    default: break;
  }
  if (argument.startsWith("--filter=")) {
    options.filter = readStateFilter(argument.slice("--filter=".length));
    return 0;
  }
  const prefix = argument.startsWith("--agent=") ? "--agent=" : argument.startsWith("--agent-id=") ? "--agent-id=" : null;
  options.targets.push(prefix === null ? argument : namedTarget(argument, prefix, EVENTS_USAGE));
  return 0;
}

export function parseEventsOptions(args: string[]): EventsOptions {
  // Bare `orch events` IS the monitor: every state of every agent you own, in readable
  // lines, self-contained enough to act on without a second command. Flags only ever
  // narrow it (`--filter`) or widen it to the rest of your space (`--space-wide`).
  const options: EventsOptions = {
    json: false, sinceSeq: undefined, once: false, scope: "auto", filter: null, targets: [],
  };
  for (let index = 0; index < args.length; index++) index += readEventsFlag(options, args, index);
  return options;
}

function presenceMetadata(key: string): PresenceMetadata {
  const entity = buildEntities().find((candidate) => candidate.presence?.key === key || candidate.key === key);
  return { name: entity?.name ?? null, tab: entity?.tabLabel ?? null, pid: entity?.presence?.status?.pid };
}

function eventsItems(options: EventsOptions): Map<string, WatchItem> {
  const items = new Map<string, WatchItem>();
  if (!options.targets.length) {
    const presences = scopeToSpace(
      orchDir(),
      [...loadPresence().values()].filter((presence) => presence.alive && looksLikePaneKey(presence.key)),
      (presence) => presence.key,
      callerSpace(),
      { all: false },
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
    const entity = resolveTarget(target, { all: false });
    if (!entity.presence) die(`Target "${target}" has no agent dir to watch.`);
    items.set(entity.presence.key, {
      key: entity.presence.key,
      dir: entity.presence.dir,
      name: entity.name,
      tab: entity.tabLabel,
      pid: entity.presence.status?.pid,
    });
  }
  // An empty fleet is a valid watch: workers may be spawned after this command starts.
  return items;
}

export function formatEventGap(oldestSeq: number): string {
  return `warning: event history gap; events before sequence ${oldestSeq} were pruned (replay resumes at sequence ${oldestSeq})\n`;
}

export function renderEvent(event: NotifyEvent, json: boolean, streamSeq: number, space = event.space ?? null): string {
  const coordinate = space !== null && space !== undefined && space.length > 0 ? space : null;
  if (json) {
    const { space: _space, ...withoutSpace } = event;
    const payload = coordinate === null
      ? { ...withoutSpace, streamSeq }
      : { ...withoutSpace, space: coordinate, streamSeq };
    return JSON.stringify(payload);
  }
  // The plexer coordinate is opaque: echo it verbatim and never resolve it to a
  // configured label that could make the coordinate look like an orch-chosen name.
  const textEvent: NotifyEvent = { ...event, space: coordinate ?? "" };
  // What happened, and nothing about the fleet's books. Cost and pack capacity are
  // `orch status` columns; a stream that carried them made every transition read
  // like a status row and buried the one thing the line exists to say.
  const title = notificationText(textEvent, { colorize: true }).title;
  return `${title}  ${event.oldState}->${event.newState}`;
}

function eventWriter(options: EventsOptions): (event: NotifyEvent, streamSeq: number) => boolean {
  return (event, streamSeq): boolean => {
    if (options.filter !== null && !options.filter.has(event.newState)) return false;
    const space = event.space ?? spaceOf(orchDir(), event.key);
    process.stdout.write(`${renderEvent(event, options.json, streamSeq, space)}\n`);
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
      if (!isNotifyEvent(value) || !context.accepts(value.key)) return;
      if (context.emit(value, streamSeq) && context.options.once) {
        subscription.close();
        process.exit(0);
      }
    },
    (oldestSeq) => {
      commandLogger().warn("events.replay-gap", { oldestSeq });
      process.stdout.write(formatEventGap(oldestSeq));
    },
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

export function sinkLabel(sink: NotifyEntry): string {
  if (sink.id === "webhook") {
    const url = sink.url;
    return `webhook ${typeof url === "string" ? url : ""}`;
  }
  if (sink.id === "command") {
    const command = sink.command;
    return `command ${Array.isArray(command) ? command.map((part) => String(part)).join(" ") : ""}`;
  }
  return sink.id;
}

