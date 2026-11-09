// The links orchd holds to the hosts `settings.hosts` names: one ssh process per host
// running `orch host serve` there, one owner of each link's retries, and the two
// facts kept apart that a remote agent's liveness needs. Whether the LINK is up is
// this module's answer. Whether a PROCESS on that host is alive is the far side's
// answer, and only while the link is up; with the link down it is unknown, never dead.
import type { Readable, Writable } from "node:stream";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { framedLineReader } from "../daemon/client/wire.ts";
import { formatAge } from "../format.ts";
import { errorMessage } from "../util.ts";
import { bindHostName, closeHostLink, hostIdOfName, latestHostLink, openHostLink, touchHostLink } from "../store/host-rows.ts";
import { spawnRemoteOrch } from "./ssh.ts";
import { encodeHostFrame, HOST_RESULTS, parseHostFrame, type HostMethod, type HostParamsOf, type HostResultOf } from "./protocol.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { HostGreeting, HostLinkView } from "../types/host.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";

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

/** The far verb a link runs. */
const SERVE_ARGS = ["host", "serve"] as const;

/** The exit code a POSIX shell gives a command it cannot find. */
const COMMAND_NOT_FOUND = 127;

export type HostLinkState =
  | { readonly kind: "idle" }
  | { readonly kind: "connecting" }
  | { readonly kind: "up"; readonly greeting: HostGreeting; readonly since: number }
  | { readonly kind: "down"; readonly reason: string; readonly at: number };

export interface HostLinkDeps {
  readonly orchDir: OrchDir;
  readonly settings: () => OrchSettings;
  readonly logger: Logger;
  readonly spawn?: LinkSpawner;
  readonly now?: () => number;
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

export class HostLink {
  private state: HostLinkState = { kind: "idle" };
  private process: LinkProcess | null = null;
  private connecting: Promise<HostGreeting> | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private failures = 0;
  private wanted = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

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

  ping(): Promise<HostResultOf<"ping">> {
    return this.send("ping", {}).then((value) => HOST_RESULTS.ping.parse(value));
  }

  /** Whether a process on this host is alive. Rejects while the link is down: the answer is unknown. */
  alive(params: HostParamsOf<"alive">): Promise<HostResultOf<"alive">> {
    return this.send("alive", params).then((value) => HOST_RESULTS.alive.parse(value));
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

  private send(method: HostMethod, params: unknown): Promise<unknown> {
    const process = this.process;
    if (this.state.kind !== "up" || process === null) {
      return Promise.reject(new Error(`${this.name} is not linked, so orch cannot ask it`));
    }
    const id = this.nextId++;
    const timeoutMs = this.deps.settings().links.request_timeout_ms;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${this.name} did not answer ${method} within ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref?.();
      this.pending.set(id, { resolve, reject, timer });
      process.stdin.write(encodeHostFrame({ kind: "request", id, method, params }));
    });
  }

  private attempt(): Promise<HostGreeting> {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.state = { kind: "connecting" };
    const links = this.deps.settings().links;
    const child = (this.deps.spawn ?? sshSpawner)(this.deps.orchDir, this.host, links, SERVE_ARGS);
    this.process = child;
    // What the far side wrote since it last said hello: everything it printed before
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

      framedLineReader(child.stdout, (line) => {
        const frame = parseHostFrame(line.trim());
        if (frame === null) return;
        if (frame.kind === "greeting") {
          stderr = [];
          const refusal = this.linkUp(frame.greeting);
          if (refusal === null) settle({ greeting: frame.greeting });
          else {
            // Another machine answered on this route. Redialing reaches it again, so
            // the link stays down until someone looks.
            this.wanted = false;
            endedBecause = refusal;
            settle({ reason: refusal });
            child.kill();
          }
          return;
        }
        if (frame.kind === "reply" || frame.kind === "failure") this.settlePending(frame.id, frame.kind === "reply" ? { value: frame.result } : { message: frame.message });
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
    this.deps.logger.info("host.link-up", { host: this.name, hostId: greeting.host.id, version: greeting.version, codeHash: greeting.codeHash });
    return null;
  }

  private dest(): string {
    return this.host.dest;
  }

  private startPinging(hostId: string): void {
    this.pingTimer = setInterval(() => {
      this.ping()
        .then(() => { touchHostLink(this.deps.orchDir, hostId, this.now()); })
        .catch((error: unknown) => { this.deps.logger.warn("host.ping-failed", { host: this.name, error: errorMessage(error) }); });
    }, this.deps.settings().links.ping_interval_ms);
    this.pingTimer.unref?.();
  }

  private settlePending(id: number, outcome: { value: unknown } | { message: string }): void {
    const pending = this.pending.get(id);
    if (pending === undefined) return;
    this.pending.delete(id);
    clearTimeout(pending.timer);
    if ("value" in outcome) pending.resolve(outcome.value);
    else pending.reject(new Error(`${this.name}: ${outcome.message}`));
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
    if (this.wanted) this.scheduleRetry();
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
