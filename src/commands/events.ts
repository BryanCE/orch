import { loadConfig } from "../config.ts";
import { buildEntities, resolveTarget, spaceOf } from "../entities.ts";
import { callerSpace } from "../identity/self.ts";
import { launchCredential } from "../identity/launch.ts";
import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { isRecord } from "../util.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { sameSpace, scopeToSpace } from "../policy/space.ts";
import { subscribeEvents } from "../daemon/rpc.ts";
import { ensureDaemon, rpcRegisterSession } from "../daemon/reach.ts";
import { deliver } from "../notify/router.ts";
import { notificationText } from "../notify/format.ts";
import { currentLease } from "../store/lease-rows.ts";
import { die } from "./target.ts";
import { commandLogger } from "./logging.ts";
import type { PresenceMetadata } from "../types/daemon.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { NotifyEntry } from "../types/config.ts";
import type { EventScopeInput } from "../types/command.ts";

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
  accepts: (key: string) => boolean;
  emit: (event: NotifyEvent, streamSeq: number) => boolean;
}

export function eventInMineScope(input: Omit<EventScopeInput, "anyAgent">): boolean {
  if (input.mineAddress === undefined || input.mineAddress.length === 0) return false;
  // A live foreign lease excludes the agent even when this session originally spawned it.
  if (input.leaseOwner !== null && input.leaseOwner !== input.mineAddress) return false;
  return input.leaseOwner === input.mineAddress || input.recordSpawnedBy === input.mineAddress;
}

export function eventInScope(input: EventScopeInput): boolean {
  return input.anyAgent || eventInMineScope(input);
}

/**
 * Whether a streamed event belongs to the caller's space.
 *
 * A1 / CLAUDE.md Rule 11: the agent's space is an ENVIRONMENT axis composed from
 * `agent_spaces` and read through {@link spaceOf}, never a segment sliced out of
 * the identity key. Reading it out of the key pinned the stream to the space the
 * agent was BORN in, so a moved or adopted agent kept appearing in a space it had
 * left and vanished from the one it actually occupies.
 */
export function eventInSpaceScope(root: string, key: string, callerSpace: string | null, all: boolean): boolean {
  return all || sameSpace(spaceOf(root, key), callerSpace);
}

export async function cmdEvents(args: string[]) {
  const options = parseEventsOptions(args);
  await ensureDaemon(orchDir());
  const items = eventsItems(options);
  const mineAddress = options.mine ? launchCredential() ?? (await rpcRegisterSession(orchDir())).id : undefined;
  const accepts = (key: string): boolean => {
    // The key IS the minted id (A1), so there is one lookup and no second id space.
    const agentId = tryParseIdentity(key)?.id ?? null;
    const inScope = options.targets.length
      ? items.has(key)
      : agentId !== null && eventInSpaceScope(orchDir(), agentId, callerSpace(), options.all);
    if (!inScope) return false;
    const leaseOwner = currentLease(orchDir(), agentId ?? key)?.orchId ?? null;
    return eventInScope({
      anyAgent: !options.mine,
      mineAddress,
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
  const sinks = loadConfig(orchDir()).notify;
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

export function parseEventsOptions(args: string[]): EventsOptions {
  let statusFilter: Set<string> | null = null;
  let all = false;
  // The norm is a readable line per transition that needs no jq to make sense of;
  // --json opts into the raw record for a caller that parses it.
  let json = false;
  let sinceSeq: number | undefined;
  let once = false;
  // An orchestrator watches the agents it currently drives. Every other session's agents are
  // noise it has no business acting on, so the lease filter is the default and --any-agent lifts it.
  let mine = true;
  const targets: string[] = [];
  const usage = "usage: orch events [--agent=<name>] [--agent-id=<id>] [--mine] [--any-agent] [--all] [--status s[,s...]] [--json] [--since-seq <n>] [--once]";
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
    else if (argument === "--mine") mine = true;
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
    const presences = scopeToSpace(
      orchDir(),
      [...loadPresence().values()].filter((presence) => presence.alive && looksLikePaneKey(presence.key)),
      (presence) => presence.key,
      callerSpace(),
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
  const title = notificationText(textEvent, { colorize: true }).title;
  const transition = `  ${event.oldState}->${event.newState}`;
  const cost = typeof event.cost === "number" ? `  $${event.cost.toFixed(2)}` : "";
  return `${title}${transition}${cost}`;
}

function eventWriter(options: EventsOptions): (event: NotifyEvent, streamSeq: number) => boolean {
  return (event, streamSeq): boolean => {
    if (options.statusFilter && !options.statusFilter.has(event.newState)) return false;
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

