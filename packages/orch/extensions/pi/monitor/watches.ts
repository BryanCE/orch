// The watches of one session: the tools start and stop them, the views list and show them.
import { Watch, type WatchLimits, type WatchPorts, type WatchSpec } from "./watch.ts";
import type { BashOperations } from "@earendil-works/pi-coding-agent";

export class Watches {
  private readonly all = new Map<string, Watch>();
  private readonly listeners = new Set<() => void>();
  private next = 1;

  /** `run` is the harness's own shell runner, which streams the command's output. */
  constructor(private readonly run: BashOperations["exec"]) {}

  start(spec: Omit<WatchSpec, "id">, limits: WatchLimits, ports: Omit<WatchPorts, "onChange">): Watch {
    const id = `m${this.next}`;
    this.next += 1;
    const watch = new Watch({ ...spec, id }, limits, { ...ports, onChange: () => this.changed() }, this.run);
    this.all.set(id, watch);
    this.changed();
    return watch;
  }

  get(id: string): Watch | undefined {
    return this.all.get(id);
  }

  /** Every watch this session started, newest first, ended ones included. */
  list(): readonly Watch[] {
    return [...this.all.values()].reverse();
  }

  running(): readonly Watch[] {
    return this.list().filter((watch) => watch.running);
  }

  /** End every running watch; the session that started them is going away. */
  stopAll(): void {
    for (const watch of this.running()) watch.halt({ kind: "stopped", by: "user" });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    for (const listener of [...this.listeners]) listener();
  }
}
