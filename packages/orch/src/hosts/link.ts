// The links orchd holds to the hosts `settings.hosts` names: one ssh process per host
// running `orch host serve` there, which pipes the link into that host's orchd. Over it
// this orchd speaks the daemon RPC to the other orchd, one owner of each link's retries.
// A link is up only once this orchd has caught up on the host's agents, and synchronizing until then.
// Whether the LINK is up is this module's answer. What an agent on that host is doing is that
// host's orchd's answer, carried by the events it sends; with the link down it is unknown,
// never dead.
import { randomUUID } from "node:crypto";
import type { Readable, Writable } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { encodeRequest, framedLineReader, parseRpcLine, responseError, type RpcLine } from "../daemon/client/wire.ts";
import { daemonResult, HOST_GREETING, RPC_RESULTS, type ParamsOf, type ResultOf, type RpcMethod } from "../daemon/client/protocol.ts";
import { hostsRunningLiveAgents } from "../store/agent-rows.ts";
import { hostIdentity } from "./identity.ts";
import { formatAge } from "../format.ts";
import { errorMessage } from "../util.ts";
import { bindHostName, closeHostLink, forgetHostEventCursor, hostEventCursor, hostIdOfName, latestHostLink, openHostLink, setHostEventCursor, touchHostLink, type HostEventCursor } from "../store/host-rows.ts";
import { spawnRemoteOrch } from "./ssh.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { HostGreeting, HostLinkView } from "../types/host.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";
import type { HostId } from "../types/host.ts";
import type { HostedProcess, LinkedHost } from "../types/process.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { StatusRow } from "../types/command.ts";
import type { ScreenChunk, ScreenSource } from "../types/screen.ts";

/** One line from the far orchd, or null for one that is not daemon RPC. */
function parseLine(raw: string): RpcLine | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    return parseRpcLine(JSON.parse(text));
  } catch {
    return null;
  }
}

/** The far side as a process: its pipes, and how it ended. */
export interface LinkProcess {
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr: Readable;
  /** Resolves with the exit code once the process is gone; null when a signal ended it. */
  readonly exited: Promise<number | null>;
  kill(): void;
}

export type LinkSpawner = (orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"], args: readonly string[]) => LinkProcess;

function linkProcessOf(child: ChildProcessWithoutNullStreams): LinkProcess {
  const exited = new Promise<number | null>((resolve) => {
    child.once("exit", (code) => resolve(code));
    child.once("error", () => resolve(null));
  });
  return { stdin: child.stdin, stdout: child.stdout, stderr: child.stderr, exited, kill: () => { child.kill(); } };
}

const sshSpawner: LinkSpawner = (orchDir, host, links, args) => linkProcessOf(spawnRemoteOrch(orchDir, host, links, args));

/** The far verb a link runs. The host's forced command decides the words that actually run,
 *  pinning which host this link speaks for. */
const SERVE_ARGS = ["host", "serve"] as const;

/** The id of the `peer-hello` `orch host serve` sends for this link; the far orchd's reply to it is
 *  the greeting. Every request this side sends counts up from the next one. */
const HELLO_ID = 0;

/** The far orchd's answer to `peer-hello`: its greeting, or why it could not be read. */
function greetingOf(line: RpcLine): { greeting: HostGreeting } | { reason: string } | null {
  if (line.kind === "error" && line.id === HELLO_ID) return { reason: line.error.message };
  if (line.kind !== "reply" || line.id !== HELLO_ID) return null;
  const greeting = HOST_GREETING.safeParse(line.result);
  return greeting.success ? { greeting: greeting.data } : { reason: "unreadable" };
}

/** The exit code a POSIX shell gives a command it cannot find. */
const COMMAND_NOT_FOUND = 127;

type HostLinkState =
  | { readonly kind: "idle" }
  | { readonly kind: "connecting"; readonly attempt: number }
  | { readonly kind: "synchronizing"; readonly greeting: HostGreeting; readonly attempt: number }
  | { readonly kind: "up"; readonly greeting: HostGreeting; readonly since: number }
  | { readonly kind: "backoff"; readonly reason: string; readonly at: number; readonly retryAt: number; readonly attempt: number }
  | { readonly kind: "down"; readonly reason: string; readonly at: number }
  | { readonly kind: "blocked"; readonly reason: string; readonly at: number };

/** Where an event a linked host's orchd sent about one of this host's agents lands. */
export type HostEventSink = (host: LinkedHost, event: NotifyEvent) => void;

/** Where a linked host's own rows for the agents this host asked it to run land, read as its
 *  link came up. `askedAt` is when they were asked for: an agent made here since is not in them. */
export type HostAgentsSink = (host: LinkedHost, rows: readonly StatusRow[], askedAt: number) => void;

export interface HostLinkDeps {
  readonly orchDir: OrchDir;
  readonly settings: () => OrchSettings;
  readonly logger: Logger;
  readonly events: HostEventSink;
  readonly agents: HostAgentsSink;
  /** Called after the store records that a host's link opened or closed, so what orchd holds of its agents is re-read. */
  readonly changed: (host: string) => void;
  readonly spawn?: LinkSpawner;
  readonly now?: () => number;
}

/** One agent's screen streamed over a link, shared by every viewer here that follows it. */
interface LinkedScreen {
  readonly viewers: Set<(chunk: ScreenChunk) => void>;
  /** The size the far terminal was last asked for. */
  cols: number;
  rows: number;
}

interface Pending {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/** Why a link that never sent its greeting, or stopped answering, is down. The two
 *  refusals a new host gives are named with the step that clears them. */
function failureReason(name: string, code: number | null, stderr: readonly string[]): string {
  const lastStderr = stderr.at(-1) ?? null;
  // sh says `orch: not found`, cmd `'orch' is not recognized`, PowerShell `The term 'orch' is not recognized`.
  if (code === COMMAND_NOT_FOUND || stderr.some((line) => /orch: (?:command )?not found|'orch' is not recognized/.test(line))) {
    return `orch is not installed on ${name}, or is not on the PATH that account's shell sets. Run orch host add ${name} again to see which orch it finds`;
  }
  if (lastStderr?.includes("Permission denied (publickey")) {
    return `${name} refused orch's key. Put the line 'orch host key ${name}' prints into ~/.ssh/authorized_keys there`;
  }
  if (lastStderr !== null && /Host key verification failed|REMOTE HOST IDENTIFICATION HAS CHANGED/.test(lastStderr)) {
    return `${name} presented a host key orch does not trust. Run orch host add ${name} again to review it`;
  }
  if (lastStderr !== null) return `${name} said:\n${stderr.join("\n")}`;
  return code === null ? "ssh was stopped by a signal" : `ssh exited with code ${code}`;
}

/** A request the far orchd may or may not have taken: the link was not up, dropped under it,
 *  or it got no answer in time. Its outcome is not known here. */
export class LinkUnanswered extends Error {}

class HostLink {
  private state: HostLinkState = { kind: "idle" };
  private process: LinkProcess | null = null;
  private connecting: Promise<HostGreeting> | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private failures = 0;
  private wanted = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  /** When the far side last sent a line, of any kind. */
  private lastHeard = 0;
  /** The host that answered this link's greeting; null while no process is greeted. */
  private far: HostGreeting | null = null;
  /** Events the far orchd sent while this orchd held no place in its log, in order. They are
   *  taken once the reloaded state gives the place: the ones after it apply, the rest are in it. */
  private heldEvents: { readonly event: NotifyEvent; readonly seq: number | undefined }[] = [];
  /** This orchd's place in the far orchd's event log. Null while it holds none: the state of
   *  its agents there is being reloaded, and gives one. */
  private place: HostEventCursor | null = null;
  /** The agent screens viewers here follow on this host, by agent. Each streams over the link
   *  once, tagged with its agent, and fans out here. */
  private readonly screens = new Map<string, LinkedScreen>();

  constructor(readonly name: string, private host: HostSettings, private readonly deps: HostLinkDeps) {}

  current(): HostLinkState {
    return this.state;
  }

  /** The host this link reaches, as settings now say. A changed destination drops the link. */
  retarget(host: HostSettings): void {
    if (host.dest === this.host.dest && host.orch_dir === this.host.orch_dir) return;
    this.host = host;
    if (this.process !== null) this.process.kill();
  }

  /** Bring the link up, or join the attempt already running. Rejects with why it is down. */
  connect(): Promise<HostGreeting> {
    this.wanted = true;
    if (this.state.kind === "up") return Promise.resolve(this.state.greeting);
    this.connecting ??= this.attempt().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  /** The link up, or a refusal that says the host is offline, why, and when it was last seen. */
  async requireUp(): Promise<HostGreeting> {
    try {
      return await this.connect();
    } catch (error: unknown) {
      const seen = this.lastSeen();
      throw new Error(`${this.name} is offline: ${errorMessage(error)}. ${seen === null ? "orch has never reached it." : `Last seen ${formatAge(seen)} ago.`}`);
    }
  }

  /** Proves the far orchd answers. */
  ping(): Promise<ResultOf<"daemon-status">> {
    return this.ask("daemon-status", undefined);
  }

  /** Whether each process is alive on this host, in order: a caller on this host proving
   *  its process. Rejects while the link is down: the answer is unknown. */
  async alive(processes: readonly HostedProcess[]): Promise<readonly boolean[]> {
    processes.forEach((process) => this.requireHere(process));
    const { alive } = await this.call("peer-alive", { processes: [...processes] });
    if (alive.length !== processes.length) throw new Error(`${this.name} answered for ${alive.length} processes, asked about ${processes.length}`);
    return alive;
  }

  /** Stop wanting the link and end it. */
  close(): void {
    this.wanted = false;
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.process !== null) this.process.kill();
    if (this.process === null && this.state.kind === "backoff") this.state = { kind: "down", reason: this.state.reason, at: this.state.at };
  }

  view(): HostLinkView {
    const state = this.state;
    return {
      name: this.name,
      dest: this.host.dest,
      state: state.kind,
      hostId: hostIdOfName(this.deps.orchDir, this.name),
      greeting: state.kind === "up" ? state.greeting : null,
      reason: state.kind === "backoff" || state.kind === "down" || state.kind === "blocked" ? state.reason : null,
      lastSeen: this.lastSeen(),
      retryAt: state.kind === "backoff" ? state.retryAt : null,
      attempt: state.kind === "connecting" || state.kind === "synchronizing" || state.kind === "backoff" ? state.attempt : null,
    };
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private lastSeen(): number | null {
    const hostId = hostIdOfName(this.deps.orchDir, this.name);
    if (hostId === null) return null;
    const link = latestHostLink(this.deps.orchDir, hostId);
    if (link === null) return null;
    return link.until === null && this.state.kind === "up" ? this.now() : link.lastSeen;
  }

  /** Ask the host's orchd. Rejects while the link is down, or with the far orchd's refusal.
   *  `waitMs` is how long the far orchd may take on top of the link's own request time: a verb
   *  that waits on its agent there, as a session clear does, answers only once that wait ends. */
  async call<M extends RpcMethod>(method: M, params: ParamsOf<M>, waitMs = 0): Promise<ResultOf<M>> {
    if (this.state.kind !== "up") throw new Error(`${this.name} is not linked, so orch cannot ask it`);
    return daemonResult(method, RPC_RESULTS[method].parse(await this.request(method, params, waitMs)));
  }

  /** Ask the host's orchd to do something once. A request the link dropped under, or that got
   *  no answer in time, may or may not have been taken, so it is sent again under the same id
   *  once the link is back: the far orchd answers a request it already took with what it
   *  answered then. Gives up `links.deliver_timeout_ms` after the first send. */
  async deliver<M extends RpcMethod>(method: M, params: ParamsOf<M>, waitMs = 0): Promise<ResultOf<M>> {
    const once = randomUUID();
    const links = this.deps.settings().links;
    const deadline = this.now() + links.deliver_timeout_ms + waitMs;
    let sent = false;
    for (;;) {
      try {
        await this.connect();
      } catch (error: unknown) {
        // Nothing was sent: the host is simply offline.
        if (!sent) throw error;
        if (this.now() >= deadline) throw new Error(`${this.name} went offline before it answered ${method}, so whether it was done is not known: ${errorMessage(error)}`);
        await new Promise((resolve) => { setTimeout(resolve, links.retry_floor_ms).unref?.(); });
        continue;
      }
      sent = true;
      try {
        return daemonResult(method, RPC_RESULTS[method].parse(await this.request(method, params, waitMs, once)));
      } catch (error: unknown) {
        if (!(error instanceof LinkUnanswered) || this.now() >= deadline) throw error;
      }
    }
  }

  private async ask<M extends RpcMethod>(method: M, params: ParamsOf<M>): Promise<ResultOf<M>> {
    return daemonResult(method, RPC_RESULTS[method].parse(await this.request(method, params, 0)));
  }

  private request<M extends RpcMethod>(method: M, params: ParamsOf<M>, waitMs: number, once?: string): Promise<unknown> {
    const process = this.process;
    if (process === null || process.stdin.writableEnded) {
      return Promise.reject(new LinkUnanswered(`${this.name} is not linked, so orch cannot ask it`));
    }
    const id = this.nextId++;
    const timeoutMs = this.deps.settings().links.request_timeout_ms + waitMs;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new LinkUnanswered(`${this.name} did not answer ${method} within ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref?.();
      this.pending.set(id, { resolve, reject, timer });
      process.stdin.write(encodeRequest(id, method, params, once));
    });
  }

  /** Follow an agent's screen on this host: `viewer` gets every piece of it from now on, and
   *  the far orchd sends a fresh snapshot. `started` settles once the far orchd streams it. */
  attachScreen(key: string, size: { cols: number; rows: number }, viewer: (chunk: ScreenChunk) => void): { source: ScreenSource; started: Promise<void> } {
    let screen = this.screens.get(key);
    if (screen === undefined) {
      screen = { viewers: new Set(), cols: size.cols, rows: size.rows };
      this.screens.set(key, screen);
    }
    screen.viewers.add(viewer);
    screen.cols = size.cols;
    screen.rows = size.rows;
    const source: ScreenSource = {
      input: async (data) => { await this.call("screen-input", { key, data }); },
      resize: async (cols, rows) => {
        const current = this.screens.get(key);
        if (current !== undefined) {
          current.cols = cols;
          current.rows = rows;
        }
        await this.call("screen-resize", { key, cols, rows });
      },
      refresh: () => { this.restreamScreen(key); },
      release: () => { this.releaseScreen(key, viewer); },
    };
    const started = this.call("peer-attach-screen", { key, cols: size.cols, rows: size.rows }).then(() => undefined);
    return { source, started };
  }

  /** Ask the far orchd to stream a screen again, which starts with a fresh snapshot. */
  private restreamScreen(key: string): void {
    const screen = this.screens.get(key);
    if (screen === undefined) return;
    this.call("peer-attach-screen", { key, cols: screen.cols, rows: screen.rows })
      .catch((error: unknown) => { this.deps.logger.warn("host.screen-refresh-failed", { host: this.name, key, error: errorMessage(error) }); });
  }

  /** One viewer here let go; the last one stops the stream over the link. */
  private releaseScreen(key: string, viewer: (chunk: ScreenChunk) => void): void {
    const screen = this.screens.get(key);
    if (screen === undefined || !screen.viewers.delete(viewer) || screen.viewers.size > 0) return;
    this.screens.delete(key);
    if (this.state.kind !== "up") return;
    this.call("screen-detach", { key })
      .catch((error: unknown) => { this.deps.logger.debug("host.screen-detach-failed", { host: this.name, key, error: errorMessage(error) }); });
  }

  /** End every viewer here of an agent's screen: the agent ended, or its host no longer has it.
   *  Each viewer's `orch attach` exits with `reason`, and its pane goes with it. */
  endScreen(key: string, reason: string): void {
    this.takeScreen(key, { kind: "end", reason });
  }

  /** The link came back: ask the far orchd to stream each screen viewers here still follow.
   *  A screen whose agent is gone there ends here, so no pane waits on a stream that never comes. */
  private reattachScreens(): void {
    for (const [key, screen] of this.screens) {
      this.call("peer-attach-screen", { key, cols: screen.cols, rows: screen.rows })
        .catch((error: unknown) => { this.endScreen(key, `${this.name} no longer streams ${key}: ${errorMessage(error)}`); });
    }
  }

  /** A piece of a screen from the far orchd, to every viewer here following it. */
  private takeScreen(key: string, chunk: ScreenChunk): void {
    const screen = this.screens.get(key);
    if (screen === undefined) return;
    if (chunk.kind === "end") this.screens.delete(key);
    for (const viewer of [...screen.viewers]) viewer(chunk);
  }

  /** Refuse to ask this host about a process recorded on another one. */
  private requireHere(process: HostedProcess): void {
    const bound = hostIdOfName(this.deps.orchDir, this.name);
    if (bound !== process.host) throw new Error(`process ${process.pid} is recorded on host ${process.host}, not on ${this.name}`);
  }

  /** A line from the far orchd that is not the greeting. */
  private receive(line: RpcLine): void {
    switch (line.kind) {
      case "reply":
        if (line.id !== null) this.settlePending(line.id, { value: line.result });
        return;
      case "error":
        if (line.id !== null) this.settlePending(line.id, { error: responseError(line) });
        return;
      case "event":
        this.take(line.event, line.seq);
        return;
      // A place that does not continue is answered with snapshot-required, never a gap.
      case "gap":
        return;
      case "snapshot-required":
        this.dropPlace();
        return;
      // No bridge attaches over a link.
      case "delivery":
        return;
      case "screen":
        this.takeScreen(line.key, line.chunk);
        return;
      default: {
        const exhaustive: never = line;
        throw new Error(`unknown rpc line ${String(exhaustive)}`);
      }
    }
  }

  /** Follow the far orchd's events about the agents this host asked it to run. A place held in
   *  its log resumes right after the last event taken, so nothing a dropped link missed is
   *  lost or taken twice, while the far orchd last answered within `links.resume_max_age_ms`
   *  and still writes that log. Otherwise the place is dropped: this orchd reloads what the far
   *  orchd holds of those agents now, and follows from the place that state was read at.
   *  The link is up only once this settles. */
  private async subscribe(hostId: HostId, lastSeen: number | null): Promise<void> {
    const held = hostEventCursor(this.deps.orchDir, hostId);
    const fresh = lastSeen !== null && this.now() - lastSeen <= this.deps.settings().links.resume_max_age_ms;
    this.place = fresh ? held : null;
    if (held !== null && !fresh) forgetHostEventCursor(this.deps.orchDir, hostId);
    this.heldEvents = [];
    const askedAt = this.now();
    await this.ask("subscribe-events", this.place === null ? {} : { since: this.place.seq, log: this.place.log });
    // By now the far orchd has replayed what was missed, or said the place does not continue.
    if (this.place === null) await this.reload(hostId, askedAt);
  }

  /** Read what the far orchd holds now of the agents this host asked it to run, hand it on, and
   *  hold the place in its log that state was read at. `askedAt` is when the state was asked
   *  for: an agent this host asked for since is not in it. */
  private async reload(hostId: HostId, askedAt: number): Promise<void> {
    const status = await this.ask("peer-status", {});
    if (this.far?.host.id !== hostId) return;
    this.deps.agents({ id: hostId, name: this.name }, status.rows, askedAt);
    this.place = { seq: status.seq, log: status.log };
    setHostEventCursor(this.deps.orchDir, hostId, this.place);
    const held = this.heldEvents;
    this.heldEvents = [];
    for (const { event, seq } of held) this.take(event, seq);
  }

  /** This orchd's place does not continue in the far orchd's log: drop it. The state reloaded
   *  next gives the place to follow from. */
  private dropPlace(): void {
    if (this.far === null) return;
    this.place = null;
    forgetHostEventCursor(this.deps.orchDir, this.far.host.id);
  }

  /** One event from the far orchd. With no place held it waits for the state being reloaded,
   *  which gives one. An event at or below the place is already in the state this orchd
   *  holds, so it is dropped. Any other is handed on, and the place moves to it. */
  private take(event: NotifyEvent, seq: number | undefined): void {
    const far = this.far;
    if (far === null) return;
    if (this.place === null) {
      this.heldEvents.push({ event, seq });
      return;
    }
    if (seq !== undefined && seq <= this.place.seq) return;
    this.deps.events({ id: far.host.id, name: this.name }, event);
    if (seq === undefined) return;
    this.place = { seq, log: this.place.log };
    setHostEventCursor(this.deps.orchDir, far.host.id, this.place);
  }

  private attempt(): Promise<HostGreeting> {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.state = { kind: "connecting", attempt: this.failures + 1 };
    const links = this.deps.settings().links;
    const child = (this.deps.spawn ?? sshSpawner)(this.deps.orchDir, this.host, links, SERVE_ARGS);
    this.process = child;
    // What the far side wrote since it last greeted: everything it printed before
    // failing to start, or what ssh said when an up link dropped.
    let stderr: string[] = [];
    // Why orch ended the far process itself; ssh's own exit says nothing about that.
    let endedBecause: string | null = null;
    framedLineReader(child.stderr, (line) => {
      const text = line.trim();
      if (text) stderr.push(text);
    });

    return new Promise<HostGreeting>((resolve, reject) => {
      let settled = false;
      const settle = (outcome: { greeting: HostGreeting } | { reason: string }): void => {
        if (settled) return;
        settled = true;
        clearTimeout(greetingTimer);
        if ("greeting" in outcome) resolve(outcome.greeting);
        else reject(new Error(outcome.reason));
      };
      const greetingTimer = setTimeout(() => {
        endedBecause = `${this.name} did not say which host it is within ${links.request_timeout_ms}ms`;
        settle({ reason: endedBecause });
        child.kill();
      }, links.request_timeout_ms);
      greetingTimer.unref?.();

      framedLineReader(child.stdout, (raw) => {
        this.lastHeard = this.now();
        const line = parseLine(raw);
        if (line === null) return;
        const answer = greetingOf(line);
        if (answer === null) {
          this.receive(line);
          return;
        }
        if ("reason" in answer) {
          endedBecause = answer.reason === "unreadable"
            ? `${this.name} answered with a greeting this orch cannot read, so it runs orch built from another commit. Build this machine's commit there`
            : `${this.name} refused the link: ${answer.reason}`;
          settle({ reason: endedBecause });
          child.kill();
          return;
        }
        {
          stderr = [];
          // It said which host it is: from here the heartbeat watches the link, and each
          // request it is asked while this orchd catches up has its own deadline.
          clearTimeout(greetingTimer);
          const greeted = this.greeted(answer.greeting, (reason) => { endedBecause = reason; child.kill(); });
          if (greeted.kind === "refused") {
            // Another machine answered on this route. Redialing reaches it again, so the link
            // waits for a person.
            this.wanted = false;
            this.state = { kind: "blocked", reason: greeted.reason, at: this.now() };
            endedBecause = greeted.reason;
            settle({ reason: greeted.reason });
            child.kill();
            return;
          }
          greeted.synchronized.then(
            () => {
              if (this.process !== child) return;
              this.linkUp(answer.greeting);
              settle({ greeting: answer.greeting });
            },
            (error: unknown) => {
              if (this.process !== child) return;
              endedBecause = `${this.name} did not send the state of its agents: ${errorMessage(error)}`;
              settle({ reason: endedBecause });
              child.kill();
            },
          );
        }
      });

      void child.exited.then((code) => {
        const reason = endedBecause ?? failureReason(this.name, code, stderr);
        settle({ reason });
        this.linkDown(child, reason);
      });
    });
  }

  /** The far side said which host it is: bind the name to it, or refuse a different machine.
   *  A bound host's link is recorded open, its heartbeat starts, and this orchd catches up on
   *  its agents there. `drop` ends the link's process for a reason. */
  private greeted(greeting: HostGreeting, drop: (reason: string) => void): { kind: "refused"; reason: string } | { kind: "bound"; synchronized: Promise<void> } {
    const now = this.now();
    const binding = bindHostName(this.deps.orchDir, this.name, greeting.host, now);
    if (binding.kind === "mismatch") {
      return { kind: "refused", reason: `${this.dest()} answered as host ${greeting.host.name}, id ${greeting.host.id}, but ${this.name} is bound to host id ${binding.boundId}. A different machine answered; run 'orch host forget ${this.name}' if it replaced the old one` };
    }
    // When this host last answered, read before this link's own row says "now".
    const lastSeen = latestHostLink(this.deps.orchDir, greeting.host.id)?.lastSeen ?? null;
    openHostLink(this.deps.orchDir, greeting.host.id, now);
    this.far = greeting;
    this.state = { kind: "synchronizing", greeting, attempt: this.failures + 1 };
    this.deps.changed(this.name);
    this.startPinging(greeting.host.id, drop);
    return { kind: "bound", synchronized: this.subscribe(greeting.host.id, lastSeen) };
  }

  /** This orchd is in step with the far one: the link is up. */
  private linkUp(greeting: HostGreeting): void {
    this.state = { kind: "up", greeting, since: this.now() };
    this.reattachScreens();
    this.deps.logger.info("host.link-up", { host: this.name, hostId: greeting.host.id, version: greeting.version, commit: greeting.commit });
  }

  private dest(): string {
    return this.host.dest;
  }

  /** Each tick proves the link carries traffic: a far side that sent nothing for
   *  `links.silence_timeout_ms` is dropped, and otherwise it is asked to answer. */
  private startPinging(hostId: HostId, drop: (reason: string) => void): void {
    const tick = (): void => {
      const silentMs = this.now() - this.lastHeard;
      const limitMs = this.deps.settings().links.silence_timeout_ms;
      if (silentMs > limitMs) {
        drop(`${this.name} sent nothing for ${silentMs}ms, past the ${limitMs}ms links.silence_timeout_ms allows`);
        return;
      }
      this.ping()
        .then(() => { touchHostLink(this.deps.orchDir, hostId, this.now()); })
        .catch((error: unknown) => { this.deps.logger.warn("host.ping-failed", { host: this.name, error: errorMessage(error) }); });
    };
    tick();
    this.pingTimer = setInterval(tick, this.deps.settings().links.ping_interval_ms);
    this.pingTimer.unref?.();
  }

  private settlePending(id: number, outcome: { value: unknown } | { error: Error }): void {
    const pending = this.pending.get(id);
    if (pending === undefined) return;
    this.pending.delete(id);
    clearTimeout(pending.timer);
    if ("value" in outcome) pending.resolve(outcome.value);
    else pending.reject(new Error(`${this.name}: ${outcome.error.message}`));
  }

  /** The far process ended: the link is down, everything waiting on it fails, and a link
   *  still wanted redials after a backoff. */
  private linkDown(child: LinkProcess, reason: string): void {
    if (this.process !== child) return;
    this.process = null;
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const now = this.now();
    const was = this.state;
    const established = was.kind === "up";
    this.far = null;
    this.place = null;
    this.heldEvents = [];
    if (was.kind === "up" || was.kind === "synchronizing") {
      closeHostLink(this.deps.orchDir, was.greeting.host.id, now);
      this.deps.changed(this.name);
      this.deps.logger.warn("host.link-down", { host: this.name, reason });
    }
    if (was.kind === "up" && now - was.since >= this.deps.settings().links.retry_reset_after_ms) this.failures = 0;
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(new LinkUnanswered(`${this.name} went offline: ${reason}`));
    }
    if (!this.wanted) {
      // A blocked link keeps saying why; any other is simply down.
      if (this.state.kind !== "blocked") this.state = { kind: "down", reason, at: now };
      for (const key of [...this.screens.keys()]) this.takeScreen(key, { kind: "end", reason: `${this.name} went offline` });
      return;
    }
    if (established) for (const key of this.screens.keys()) this.takeScreen(key, { kind: "data", data: `\r\n[orch] ${this.name} went offline: ${reason}. Reconnecting.\r\n` });
    this.scheduleRetry(reason, now, established);
  }

  /** A wait that doubles with each failed dial, capped, each one a random time between half
   *  of it and all of it: hosts that drop together never redial together. A working link that
   *  just dropped redials after the short `links.retry_after_loss_ms` first. */
  private scheduleRetry(reason: string, now: number, established: boolean): void {
    const links = this.deps.settings().links;
    const ceiling = established && this.failures === 0
      ? links.retry_after_loss_ms
      : Math.min(links.retry_cap_ms, links.retry_floor_ms * 2 ** this.failures);
    const waitMs = Math.ceil(ceiling * (0.5 + Math.random() / 2));
    this.failures += 1;
    this.state = { kind: "backoff", reason, at: now, retryAt: now + waitMs, attempt: this.failures };
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.wanted || this.state.kind !== "backoff") return;
      // A failed redial lands in linkDown, which schedules the next one.
      this.connect().catch((error: unknown) => { this.deps.logger.debug("host.redial-failed", { host: this.name, error: errorMessage(error) }); });
    }, waitMs);
    this.retryTimer.unref?.();
  }
}

/** Every configured host's link, kept in step with `settings.hosts`. */
export class HostLinks {
  private readonly links = new Map<string, HostLink>();

  constructor(private readonly deps: HostLinkDeps) {}

  /** The link for a configured host. Refuses a name settings does not give a host. */
  link(name: string): HostLink {
    const host = this.deps.settings().hosts[name];
    if (host === undefined) {
      const names = Object.keys(this.deps.settings().hosts).sort();
      throw new Error(`no host named ${name} in settings.hosts${names.length === 0 ? "; none are configured" : `; configured: ${names.join(", ")}`}`);
    }
    let link = this.links.get(name);
    if (link === undefined) {
      link = new HostLink(name, host, this.deps);
      this.links.set(name, link);
    } else {
      link.retarget(host);
    }
    return link;
  }

  /** Whether a process instance runs on a linked host, asked now over its link. A host
   *  with no configured name, or one that cannot be reached, answers no. */
  async processIsLive(host: LinkedHost, process: HostedProcess): Promise<boolean> {
    if (this.deps.settings().hosts[host.name] === undefined) return false;
    const link = this.link(host.name);
    await link.requireUp();
    const [alive] = await link.alive([process]);
    return alive === true;
  }

  /** Bring up the link to every configured host that runs an agent this orchd holds a row for
   *  and has not seen end, so its events reach this orchd from the moment it starts. */
  follow(): void {
    const hosts = hostsRunningLiveAgents(this.deps.orchDir, hostIdentity().id);
    for (const name of Object.keys(this.deps.settings().hosts)) {
      const hostId = hostIdOfName(this.deps.orchDir, name);
      if (hostId === null || !hosts.has(hostId)) continue;
      this.link(name).connect().catch((error: unknown) => { this.deps.logger.warn("host.follow-failed", { host: name, error: errorMessage(error) }); });
    }
  }

  /** End every viewer here of an agent's screen, on whichever link streams it: the agent ended. */
  endScreen(key: string, reason: string): void {
    for (const link of this.links.values()) link.endScreen(key, reason);
  }

  /** Every configured host, linked or not, in name order. */
  views(): HostLinkView[] {
    return Object.keys(this.deps.settings().hosts).sort().map((name) => this.link(name).view());
  }

  /** Drop links to hosts settings no longer names; retarget the rest. */
  reconcile(settings: OrchSettings): void {
    for (const [name, link] of this.links) {
      const host = settings.hosts[name];
      if (host === undefined) {
        link.close();
        this.links.delete(name);
      } else {
        link.retarget(host);
      }
    }
  }

  closeAll(): void {
    for (const link of this.links.values()) link.close();
    this.links.clear();
  }
}
