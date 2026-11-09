// The links orchd holds to the hosts `settings.hosts` names: one ssh process per host
// running `orch host serve` there, which pipes the link into that host's orchd. Over it
// this orchd speaks the daemon RPC to the other orchd, one owner of each link's retries.
// Whether the LINK is up is this module's answer. What an agent on that host is doing is that
// host's orchd's answer, carried by the events it sends; with the link down it is unknown,
// never dead.
import type { Readable, Writable } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { encodeRequest, framedLineReader, parseRpcLine, responseError, type RpcLine } from "../daemon/client/wire.ts";
import { daemonResult, HOST_GREETING, RPC_RESULTS, type ParamsOf, type ResultOf, type RpcMethod } from "../daemon/client/protocol.ts";
import { hostsRunningLiveAgents } from "../store/agent-rows.ts";
import { hostIdentity } from "./identity.ts";
import { formatAge } from "../format.ts";
import { errorMessage } from "../util.ts";
import { bindHostName, closeHostLink, hostEventCursor, hostIdOfName, latestHostLink, openHostLink, setHostEventCursor, touchHostLink } from "../store/host-rows.ts";
import { spawnRemoteOrch } from "./ssh.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { HostGreeting, HostLinkView } from "../types/host.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";
import type { HostId } from "../types/host.ts";
import type { HostedProcess, LinkedHost } from "../types/process.ts";
import type { NotifyEvent } from "../types/notify.ts";
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
  | { readonly kind: "connecting" }
  | { readonly kind: "up"; readonly greeting: HostGreeting; readonly since: number }
  | { readonly kind: "down"; readonly reason: string; readonly at: number };

/** Where an event a linked host's orchd sent about one of this host's agents lands. */
export type HostEventSink = (host: LinkedHost, event: NotifyEvent) => void;

export interface HostLinkDeps {
  readonly orchDir: OrchDir;
  readonly settings: () => OrchSettings;
  readonly logger: Logger;
  readonly events: HostEventSink;
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
  /** The far orchd's sequence number of the last event taken over this link. */
  private lastSeq: number | null = null;
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
    return this.call("daemon-status", undefined);
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
  }

  view(): HostLinkView {
    const state = this.state;
    return {
      name: this.name,
      dest: this.host.dest,
      state: state.kind,
      hostId: hostIdOfName(this.deps.orchDir, this.name),
      greeting: state.kind === "up" ? state.greeting : null,
      reason: state.kind === "down" ? state.reason : null,
      lastSeen: this.lastSeen(),
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
    const value = await this.send(method, params, waitMs);
    return daemonResult(method, RPC_RESULTS[method].parse(value));
  }

  private send<M extends RpcMethod>(method: M, params: ParamsOf<M>, waitMs: number): Promise<unknown> {
    const process = this.process;
    if (this.state.kind !== "up" || process === null || process.stdin.writableEnded) {
      return Promise.reject(new Error(`${this.name} is not linked, so orch cannot ask it`));
    }
    const id = this.nextId++;
    const timeoutMs = this.deps.settings().links.request_timeout_ms + waitMs;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${this.name} did not answer ${method} within ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref?.();
      this.pending.set(id, { resolve, reject, timer });
      process.stdin.write(encodeRequest(id, method, params));
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
      case "gap":
        this.deps.logger.warn("host.events-lost", { host: this.name, after: this.lastSeq, oldestSeq: line.oldestSeq });
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

  /** Follow the far orchd's events about the agents this host asked it to run, from just
   *  after the last one taken, so nothing a dropped link missed is lost or taken twice. */
  private subscribe(hostId: HostId): void {
    this.lastSeq = hostEventCursor(this.deps.orchDir, hostId);
    // Before any event was taken, every one the far orchd still keeps is new here.
    this.call("subscribe-events", { since: this.lastSeq ?? 0 })
      .catch((error: unknown) => { this.deps.logger.warn("host.subscribe-failed", { host: this.name, error: errorMessage(error) }); });
  }

  /** One event from the far orchd: handed to this orchd, then the cursor moves past it. */
  private take(event: NotifyEvent, seq: number | undefined): void {
    if (this.state.kind !== "up") return;
    if (seq !== undefined && this.lastSeq !== null && seq <= this.lastSeq) return;
    const host = this.state.greeting.host;
    this.deps.events({ id: host.id, name: this.name }, event);
    if (seq === undefined) return;
    this.lastSeq = seq;
    setHostEventCursor(this.deps.orchDir, host.id, seq);
  }

  private attempt(): Promise<HostGreeting> {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.state = { kind: "connecting" };
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
          const refusal = this.linkUp(answer.greeting);
          if (refusal === null) settle({ greeting: answer.greeting });
          else {
            // Another machine answered on this route. Redialing reaches it again, so
            // the link stays down until someone looks.
            this.wanted = false;
            this.state = { kind: "down", reason: refusal, at: this.now() };
            endedBecause = refusal;
            settle({ reason: refusal });
            child.kill();
          }
        }
      });

      void child.exited.then((code) => {
        const reason = endedBecause ?? failureReason(this.name, code, stderr);
        settle({ reason });
        this.linkDown(child, reason);
      });
    });
  }

  /** The far side said which host it is: bind the name to it, or refuse a different machine. */
  private linkUp(greeting: HostGreeting): string | null {
    const now = this.now();
    const binding = bindHostName(this.deps.orchDir, this.name, greeting.host, now);
    if (binding.kind === "mismatch") {
      return `${this.dest()} answered as host ${greeting.host.name}, id ${greeting.host.id}, but ${this.name} is bound to host id ${binding.boundId}. A different machine answered; run 'orch host forget ${this.name}' if it replaced the old one`;
    }
    openHostLink(this.deps.orchDir, greeting.host.id, now);
    this.state = { kind: "up", greeting, since: now };
    this.failures = 0;
    this.startPinging(greeting.host.id);
    this.subscribe(greeting.host.id);
    this.reattachScreens();
    this.deps.logger.info("host.link-up", { host: this.name, hostId: greeting.host.id, version: greeting.version, commit: greeting.commit });
    return null;
  }

  private dest(): string {
    return this.host.dest;
  }

  /** Each tick proves the link answers. */
  private startPinging(hostId: HostId): void {
    const tick = (): void => {
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
    if (this.state.kind === "up") {
      closeHostLink(this.deps.orchDir, this.state.greeting.host.id, now);
      this.deps.logger.warn("host.link-down", { host: this.name, reason });
    }
    this.state = { kind: "down", reason, at: now };
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(new Error(`${this.name} went offline: ${reason}`));
    }
    // A link still wanted redials, and its screens stream again once it is back
    // (`reattachScreens`); one closed on purpose ends every viewer of its screens here.
    if (this.wanted) {
      this.scheduleRetry();
      return;
    }
    const screens = [...this.screens.keys()];
    for (const key of screens) this.takeScreen(key, { kind: "end", reason: `${this.name} went offline` });
  }

  /** Full jitter over a doubling wait, capped: hosts that drop together never redial together. */
  private scheduleRetry(): void {
    const links = this.deps.settings().links;
    const ceiling = Math.min(links.retry_cap_ms, links.retry_floor_ms * 2 ** this.failures);
    this.failures += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.wanted || this.state.kind !== "down") return;
      // A failed redial lands in linkDown, which schedules the next one.
      this.connect().catch((error: unknown) => { this.deps.logger.debug("host.redial-failed", { host: this.name, error: errorMessage(error) }); });
    }, Math.random() * ceiling);
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
