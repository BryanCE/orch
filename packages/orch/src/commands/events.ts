import { scopeToSpace, spaceOfIn, withinSpaceCeiling } from "../policy/space.ts";
import { agentInMineScope, agentInScope, resolveCallerScopeOf } from "../policy/scope.ts";
import { isAgentId } from "../backends/identity.ts";
import { rpcCall, subscribeEvents } from "../daemon/client/rpc.ts";
import { callerCredential } from "../identity/credential.ts";
import { ensureDaemon } from "../daemon/client/reach.ts";
import { deliver } from "../notify/router.ts";
import { eventState, isNotifyEvent } from "../notify/event.ts";

export { isNotifyEvent };
import { notificationHeading, notificationText, oneLine } from "../notify/format.ts";
import { die } from "./target.ts";
import { parseCommand } from "./registry.ts";
import { registerCallerSession, whoAmI, refuseNonOperatorOverride } from "./self.ts";
import { readFleet } from "./fleet.ts";
import { resolveEntity } from "./resolve.ts";
import type { Services } from "../types/services.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { NotifyEntry } from "../types/settings.ts";
import type { CallerScopeChoice, ResolvedCallerScope } from "../types/policy.ts";
import type { PendingQuestionView } from "../types/daemon.ts";
import type { AgentView } from "../types/store.ts";
import { isAgentState, type AgentState } from "../agent-state.ts";

/** The verbs that hold a stream open; `close --stream` kills any of them. */
export const STREAM_VERBS = ["events", "monitor"] as const;
export type StreamVerb = (typeof STREAM_VERBS)[number];

export interface EventsTransport {
  /** Settles when the stream is finished: `--once` matched, or close() was called. */
  readonly done: Promise<void>;
  close(): void;
}

function looksLikePaneKey(key: string): boolean {
  return isAgentId(key);
}

export interface EventsOptions {
  json: boolean;
  sinceSeq: number | undefined;
  once: boolean;
  scope: CallerScopeChoice;
  /** States the caller dropped, or null for every state — which is the default. */
  filter: Set<string> | null;
  targets: string[];
}

export interface EventsContext {
  options: EventsOptions;
  accepts: (event: NotifyEvent) => boolean;
  emit: (event: NotifyEvent, streamSeq: number) => boolean;
}

/** Whether one streamed event belongs on this caller's stream. */
export function eventAcceptor(options: EventsOptions, items: ReadonlySet<string>, scope: ResolvedCallerScope, callerSpace: string | null): EventsContext["accepts"] {
  return (event) => {
    const key = event.key;
    const type = event.type;
    // The key IS the minted id (A1), so there is one lookup and no second id space.
    const agentId = isAgentId(key) ? key : null;
    // A message event is keyed by its RECIPIENT, so mail a worker sent this session
    // carries this session's own key. That is the only event of its own a session
    // watches: its own transitions are what it is doing, not what it owns.
    if (key === scope.address) return type === "message";
    const inScope = options.targets.length
      ? items.has(key)
      : agentId !== null && withinSpaceCeiling(event.space ?? null, callerSpace);
    if (!inScope) return false;
    const leaseOwner = event.holder ?? null;
    return agentInScope({
      spaceWide: !scope.mine,
      mineAddress: scope.address,
      leaseOwner,
      recordSpawnedBy: event.spawnedBy,
    });
  };
}

/** Whether one event survives the caller's `--filter`: a named state is hidden. */
export function passesStateFilter(filter: ReadonlySet<string> | null): (event: NotifyEvent) => boolean {
  return (event) => !filter?.has(event.newState);
}

/** Whether one event belongs on the monitor: an agent state in `monitor.on`, a
 *  worker's report, or the end of a watched lock wait (got it, or gave up). A mid-turn
 *  flip (working, idle, a blocked signal and release) is the noise the monitor exists to drop. */
export function onMonitor(on: readonly AgentState[]): (event: NotifyEvent) => boolean {
  return (event) => {
    if (event.type === "message") return true;
    if (event.type === "transition" && event.oldState === "waiting" && on.includes("waiting")) return true;
    const state = eventState(event);
    return state !== undefined && on.includes(state);
  };
}

/** Both predicates must pass. */
function both(first: (event: NotifyEvent) => boolean, second: (event: NotifyEvent) => boolean): (event: NotifyEvent) => boolean {
  return (event) => first(event) && second(event);
}

export async function cmdEvents(services: Services, args: string[]) {
  const options = parseEventsOptions(args, "events");
  await streamEvents(services, "events", options, passesStateFilter(options.filter));
}

export async function cmdMonitor(services: Services, args: string[]) {
  const options = parseEventsOptions(args, "monitor");
  const shows = both(onMonitor(services.settings.current().monitor.on), passesStateFilter(options.filter));
  await streamEvents(services, "monitor", options, shows);
}

async function streamEvents(services: Services, verb: StreamVerb, options: EventsOptions, shows: (event: NotifyEvent) => boolean) {
  await ensureDaemon(services.orchDir, services.logger);
  await registerCallerSession(services);
  const self = await whoAmI(services);
  if (options.scope === "any") refuseNonOperatorOverride(self, "--space-wide");
  const fleet = await readFleet(services, true);
  const items = await eventsItems(services, options, fleet, self);
  const scope = resolveCallerScopeOf(options.scope, self);
  const accepts = eventAcceptor(options, items, scope, self.space);
  const context: EventsContext = { options, accepts, emit: eventWriter(options, shows) };
  // Notification delivery is orchd's, not the client's: the daemon fans every
  // transition out to the sinks configured in settings.json whether or not
  // anyone is streaming. `orch events` only renders.
  const transport = startEventsLiveStream(options, scope, {
    verb,
    writeNotice: (line) => process.stdout.write(line),
    startTransport: () => startEventsTransport(context, services),
    ownedAgents: () => ownedAgentCount(scope, fleet.views),
  });
  process.on("SIGINT", () => { transport.close(); });
  process.on("SIGTERM", () => { transport.close(); });
  await transport.done;
}

export async function cmdNotify(services: Services, args: string[]) {
  const { command, flags, positional } = parseCommand("notify", args);
  const usage = "usage: orch notify test [--state <state>] [--json]";
  if (command.name !== "test" || positional.length) die(usage);
  const json = flags.has("--json");
  const state = flags.value("--state") ?? "blocked";
  if (!isAgentState(state) || state === "asking") die(usage);
  const event: NotifyEvent = {
    type: "transition",
    key: "test:notify",
    agent: "notify-test",
    tab: "notify",
    model: "test:medium",
    oldState: "working",
    newState: state,
    task: "orch notify test",
    ts: new Date().toISOString(),
  };
  const settings = services.settings.current();
  const sinks = settings.notify;
  if (!sinks.length) {
    services.logger.error("notify.no-sinks", { sinkCount: 0 });
    process.stdout.write("notify test: no sinks configured\n");
    process.exitCode = 1;
    return;
  }
  const results = await Promise.all(sinks.map(async (sink) => ({ sink, ok: await deliver(services.orchDir, settings, sink, event, services.logger) })));
  if (json) process.stdout.write(JSON.stringify(results.map(({ sink, ok }) => ({ sink: sinkLabel(sink), ok }))) + "\n");
  else for (const { sink, ok } of results) process.stdout.write(`notify ${sinkLabel(sink)}: ${ok ? "ok" : "fail"}\n`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

export interface EventsLiveStreamPorts {
  /** The verb that armed the stream, named in the notice so a person knows which one is silent. */
  verb?: StreamVerb;
  writeNotice: (line: string) => void;
  startTransport: () => EventsTransport;
  /** Whether stdout is a terminal, so the banner reaches a person rather than a parser. */
  toTerminal?: boolean;
  /** How many agents the caller owns. Injected like every other fact this
   *  function needs, so the store stays out of the stream's setup. */
  ownedAgents?: () => number;
}

export function startEventsLiveStream(options: EventsOptions, scope: ResolvedCallerScope, ports: EventsLiveStreamPorts): EventsTransport {
  // Ahead of the banner, and never suppressed: a parser and a person are equally
  // misled by a stream that cannot fire, and the harness reading it is the one
  // that will sit on it for an hour.
  const owned = ports.ownedAgents?.() ?? 0;
  if (!options.json && owned === 0) ports.writeNotice(emptyScopeNotice(ports.verb ?? "events"));
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
function ownedAgentCount(scope: ResolvedCallerScope, views: readonly AgentView[]): number {
  if (!scope.mine || scope.address === undefined) return 0;
  let owned = 0;
  for (const record of views) {
    const leaseOwner = record.heldBy?.orchId ?? null;
    if (agentInMineScope({ mineAddress: scope.address, leaseOwner, recordSpawnedBy: record.spawnedBy ?? undefined })) owned += 1;
  }
  return owned;
}

/** What a caller owning nothing is told, in place of an empty stream. */
function emptyScopeNotice(verb: StreamVerb): string {
  return `orch ${verb}: you own no agents, so nothing can arrive on this stream yet.`
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

/** `--since-seq <n>`, or a refusal: a replay point that is not an integer names no event. */
function readSinceSeq(value: string | undefined, usage: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) die(usage);
  return parsed;
}

/** `--filter=working,idle`, or a refusal: an empty list drops nothing, so the flag
 *  was a typo. Same sense as `orch status --filter`: a named state is hidden. */
function readStateFilter(value: string | undefined, usage: string): Set<string> | null {
  if (value === undefined) return null;
  const states = value.split(",").map((state) => state.trim()).filter((state) => state.length > 0);
  if (states.length === 0) die(usage);
  return new Set(states);
}

/** A named target, refused when blank so it cannot widen the stream. */
function namedTarget(value: string, usage: string): string {
  const trimmed = value.trim();
  if (!trimmed) die(usage);
  return trimmed;
}

export function parseEventsOptions(args: string[], verb: StreamVerb = "events"): EventsOptions {
  // Bare `orch events` is every state of every agent you own, in readable lines,
  // self-contained enough to act on without a second command. Flags only ever drop
  // states from it (`--filter`) or widen it to the rest of your space (`--space-wide`).
  // `orch monitor` takes the same flags over the `monitor.on` states.
  const { command, flags, positional } = parseCommand(verb, args);
  const usage = `usage: ${command.usage}`;
  const named = [...flags.values("--agent"), ...flags.values("--agent-id")].map((value) => namedTarget(value, usage));
  return {
    json: flags.has("--json"),
    sinceSeq: readSinceSeq(flags.value("--since-seq"), usage),
    once: flags.has("--once"),
    scope: flags.has("--space-wide") ? "any" : "auto",
    filter: readStateFilter(flags.value("--filter"), usage),
    targets: [...positional, ...named],
  };
}

/** The presence keys a `--agent` narrowed stream accepts; every live scoped key when unnarrowed. */
async function eventsItems(services: Services, options: EventsOptions, fleet: Awaited<ReturnType<typeof readFleet>>, self: Awaited<ReturnType<typeof whoAmI>>): Promise<Set<string>> {
  const items = new Set<string>();
  if (!options.targets.length) {
    const views = new Map(fleet.views.map((view) => [view.id, view]));
    const presences = scopeToSpace(
      spaceOfIn(views),
      fleet.presence.filter((presence) => presence.alive && looksLikePaneKey(presence.key)),
      (presence) => presence.key,
      self.space,
      { all: false },
    );
    for (const presence of presences) items.add(presence.key);
  }
  for (const target of options.targets) {
    const { entity } = await resolveEntity(services, target, { all: false });
    if (!entity.presence) die(`Target "${target}" has no agent dir to watch.`);
    items.add(entity.presence.key);
  }
  // An empty fleet is a valid watch: workers may be spawned after this command starts.
  return items;
}

export function formatEventGap(oldestSeq: number): string {
  return `warning: event history gap; events before sequence ${oldestSeq} were pruned (replay resumes at sequence ${oldestSeq})\n`;
}

export function renderEvent(event: NotifyEvent, json: boolean, streamSeq: number, space = event.space ?? null): string {
  const coordinate = space !== null && space !== undefined && space.length > 0 ? space : null;
  return json ? renderEventJson(event, coordinate, streamSeq) : renderEventLine(event, coordinate);
}

function renderEventJson(event: NotifyEvent, coordinate: string | null, streamSeq: number): string {
  const { space: _space, ...withoutSpace } = event;
  const payload = coordinate === null
    ? { ...withoutSpace, streamSeq }
    : { ...withoutSpace, space: coordinate, streamSeq };
  return JSON.stringify(payload);
}

/** One readable line: what happened, and nothing about the fleet's books. Cost and pack
 *  capacity are `orch status` columns; on a stream they buried the one thing the line says. */
function renderEventLine(event: NotifyEvent, coordinate: string | null): string {
  // The plexer coordinate is opaque: echo it verbatim and never resolve it to a
  // configured label that could make the coordinate look like an orch-chosen name.
  const textEvent: NotifyEvent = { ...event, space: coordinate ?? "" };
  // Mail is its own summary: the heading, then the whole text once.
  if (event.type === "message") return `${notificationHeading(textEvent, { colorize: true })} ${oneLine(event.mail.text)}`;
  return `${notificationText(textEvent, { colorize: true }).title}  ${eventStateChange(event)}`;
}

function eventStateChange(event: Exclude<NotifyEvent, { type: "message" }>): string {
  switch (event.type) {
    case "asking":
      return `${event.oldState}->asking (asked ${event.askCount}x${event.gaveUp ? "; gave up" : ""})`;
    case "transition":
    case "closed":
    case "task":
      return `${event.oldState}->${event.newState}`;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

function eventWriter(options: EventsOptions, shows: (event: NotifyEvent) => boolean): (event: NotifyEvent, streamSeq: number) => boolean {
  return (event, streamSeq): boolean => {
    if (!shows(event)) return false;
    process.stdout.write(`${renderEvent(event, options.json, streamSeq)}\n`);
    return true;
  };
}

/** The durable question row rendered as the same asking event shape as a live transition. */
function pendingQuestionEvent(question: PendingQuestionView): NotifyEvent {
  return {
    key: question.agentId,
    agent: question.name,
    name: question.name,
    tab: null,
    model: null,
    type: "asking",
    oldState: "asking",
    newState: "asking",
    task: `Q: ${question.question}`,
    ts: new Date(question.askedAt).toISOString(),
    askCount: 1,
    gaveUp: false,
  };
}

/**
 * The daemon is the only event source, and this subscription outlives it: a
 * daemon restart drops the socket, the subscriber redials with backoff and
 * replays what the new instance still holds. One subscription covers the whole
 * session, so an orchestrator never has to poll `orch status` to notice a
 * worker went blocked.
 */
export function startEventsTransport(context: EventsContext, services: Pick<Services, "orchDir" | "logger">): EventsTransport {
  let resolveDone: (() => void) | undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  let closed = false;
  let subscription: ReturnType<typeof subscribeEvents> | undefined;
  const transport: EventsTransport = {
    done,
    close: () => {
      if (closed) return;
      closed = true;
      subscription?.close();
      resolveDone?.();
    },
  };
  const pending = rpcCall(services.orchDir, "questions", { caller: callerCredential() });
  subscription = subscribeEvents(
    services.orchDir,
    context.options.sinceSeq === undefined ? { logger: services.logger } : { since: context.options.sinceSeq, logger: services.logger },
    (value, streamSeq) => {
      if (!isNotifyEvent(value) || !context.accepts(value)) return;
      if (context.emit(value, streamSeq) && context.options.once) transport.close();
    },
    (oldestSeq) => {
      services.logger.warn("events.replay-gap", { oldestSeq });
      process.stdout.write(formatEventGap(oldestSeq));
    },
  );
  void pending.then((value) => {
    for (const question of value.questions) {
      const event = pendingQuestionEvent(question);
      if (!context.accepts(event)) continue;
      if (context.emit(event, 0) && context.options.once) {
        transport.close();
        break;
      }
    }
  }).catch(() => {
    // The live subscription remains authoritative if the snapshot RPC is unavailable.
  });
  return transport;
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

