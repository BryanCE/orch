// One watched command. Each output line is an event; lines that arrive within one batch window go
// out as one event, and a command that sends more events a minute than its limit is stopped.
// The harness runs the command, with the shell backend its own shell tool uses; the tool layer
// delivers what a watch reports.
import type { BashOperations } from "@earendil-works/pi-coding-agent";

export interface WatchLimits {
  readonly batchMs: number;
  readonly maxEventsPerMinute: number;
  readonly tailLines: number;
}

export interface WatchSpec {
  readonly id: string;
  readonly description: string;
  readonly command: string;
  readonly cwd: string;
  /** Null: the watch runs until its command exits or someone stops it. */
  readonly timeoutMs: number | null;
}

/** Why a watch ended. */
export type WatchEnd =
  /** A null code: the command was killed. */
  | { readonly kind: "exited"; readonly code: number | null }
  | { readonly kind: "stopped"; readonly by: "agent" | "user" }
  | { readonly kind: "timed-out" }
  | { readonly kind: "flooded"; readonly limit: number }
  | { readonly kind: "failed"; readonly error: string };

export interface WatchPorts {
  /** One batch of output lines, for the agent. */
  readonly onEvent: (watch: Watch, lines: readonly string[]) => void;
  readonly onEnd: (watch: Watch, end: WatchEnd) => void;
  /** Anything a view shows changed: a line, a count, the end. */
  readonly onChange: () => void;
}

const MINUTE_MS = 60_000;

export class Watch {
  readonly id: string;
  readonly description: string;
  readonly command: string;
  readonly startedAt = Date.now();
  events = 0;
  end: WatchEnd | null = null;
  readonly tail: string[] = [];

  private readonly limits: WatchLimits;
  private readonly ports: WatchPorts;
  private readonly abort = new AbortController();
  private readonly eventTimes: number[] = [];
  private pending: string[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | undefined;
  private timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  private partial = "";

  constructor(spec: WatchSpec, limits: WatchLimits, ports: WatchPorts, run: BashOperations["exec"]) {
    this.id = spec.id;
    this.description = spec.description;
    this.command = spec.command;
    this.limits = limits;
    this.ports = ports;
    run(spec.command, spec.cwd, { onData: (data) => this.read(data.toString("utf8")), signal: this.abort.signal })
      .then(({ exitCode }) => {
        this.readRest();
        this.finish({ kind: "exited", code: exitCode });
      })
      .catch((error: unknown) => this.finish({ kind: "failed", error: error instanceof Error ? error.message : String(error) }));
    if (spec.timeoutMs !== null) this.timeoutTimer = setTimeout(() => this.halt({ kind: "timed-out" }), spec.timeoutMs);
  }

  get running(): boolean {
    return this.end === null;
  }

  /** End the watch: kill its command and report why. */
  halt(end: WatchEnd): void {
    if (!this.running) return;
    this.finish(end);
    this.abort.abort();
  }

  private read(chunk: string): void {
    const lines = (this.partial + chunk).split(/\r?\n/);
    this.partial = lines.pop() ?? "";
    for (const line of lines) this.take(line);
  }

  /** The last line of output that ended without a newline. */
  private readRest(): void {
    if (this.partial !== "") this.take(this.partial);
    this.partial = "";
  }

  /** Every line goes to the tail a view shows and, while the watch runs, to the agent. */
  private take(line: string): void {
    this.tail.push(line);
    if (this.tail.length > this.limits.tailLines) this.tail.splice(0, this.tail.length - this.limits.tailLines);
    if (this.running) {
      this.pending.push(line);
      this.batchTimer ??= setTimeout(() => this.flush(), this.limits.batchMs);
    }
    this.ports.onChange();
  }

  private flush(): void {
    clearTimeout(this.batchTimer);
    this.batchTimer = undefined;
    if (this.pending.length === 0 || !this.running) return;
    const lines = this.pending;
    this.pending = [];
    const now = Date.now();
    while (this.eventTimes.length > 0 && now - this.eventTimes[0]! > MINUTE_MS) this.eventTimes.shift();
    if (this.eventTimes.length >= this.limits.maxEventsPerMinute) {
      this.halt({ kind: "flooded", limit: this.limits.maxEventsPerMinute });
      return;
    }
    this.eventTimes.push(now);
    this.events += 1;
    this.ports.onEvent(this, lines);
    this.ports.onChange();
  }

  private finish(end: WatchEnd): void {
    if (!this.running) return;
    // Lines already read reach the agent before the end does.
    if (end.kind === "exited") this.flush();
    this.end = end;
    clearTimeout(this.batchTimer);
    clearTimeout(this.timeoutTimer);
    this.ports.onEnd(this, end);
    this.ports.onChange();
  }
}
