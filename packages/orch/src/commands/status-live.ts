import { subscribeEvents } from "../daemon/rpc/client.ts";
import { ensureDaemon } from "../daemon/reach.ts";
import { orchDir } from "../presence/store.ts";
import { CLEAR_SCREEN, CTRL_C, ENTER_ALT_SCREEN, EXIT_ALT_SCREEN, dim } from "../tui/screen.ts";
import { die } from "./target.ts";
import { formatStatusTable, readStatusResult } from "./status.ts";
import type { StatusOptions } from "./status.ts";
import type { StatusRow } from "../types/command.ts";
import type { EventSubscription } from "../types/daemon.ts";

function twoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

function clockTime(date: Date): string {
  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}:${twoDigits(date.getSeconds())}`;
}

function liveHeader(rowCount: number, date: Date): string {
  return ` orch status - live  -  ${rowCount} agents  -  updated ${clockTime(date)}  -  q to quit`;
}

export type RefreshState = "idle" | "running" | "running-with-pending";

export interface RefreshController {
  readonly state: RefreshState;
  trigger(): void;
  stop(): void;
}

/** Serialize refreshes while collapsing every burst during a read to one follow-up. */
export function createRefreshController(read: () => Promise<void>): RefreshController {
  let state: RefreshState = "idle";
  let stopped = false;

  const settle = (): void => {
    if (stopped) {
      state = "idle";
      return;
    }
    if (state === "running-with-pending") {
      state = "running";
      start();
      return;
    }
    state = "idle";
  };

  const start = (): void => {
    state = "running";
    try {
      read().then(settle, settle);
    } catch {
      settle();
    }
  };

  return {
    get state(): RefreshState { return state; },
    trigger(): void {
      if (stopped) return;
      if (state === "idle") {
        start();
        return;
      }
      state = "running-with-pending";
    },
    stop(): void {
      stopped = true;
      state = "idle";
    },
  };
}

export function renderLiveStatus(
  rows: readonly StatusRow[],
  options: { all: boolean; host: boolean },
  date = new Date(),
  error?: string,
): string {
  const table = formatStatusTable(rows, options);
  const errorLine = error === undefined ? "" : `${error}\n`;
  return `${CLEAR_SCREEN}${dim(liveHeader(rows.length, date))}\n${errorLine}${table}${table ? "\n" : ""}`;
}

/** Run the terminal-bound live status view until the user quits or the process is signalled. */
export async function cmdStatusLive(options: StatusOptions): Promise<void> {
  if (options.json) die("--live renders a terminal table; drop --json");
  if (process.stdout.isTTY !== true || process.stdin.isTTY !== true) die("--live needs a terminal");
  await ensureDaemon(orchDir());

  let stopped = false;
  let resolveDone: (() => void) | undefined;
  const done = new Promise<void>((resolve) => { resolveDone = resolve; });
  let rows: readonly StatusRow[] = [];
  let host = false;
  const refreshController = createRefreshController(async () => {
    if (stopped) return;
    try {
      const result = await readStatusResult(options);
      if (stopped) return;
      rows = result.rows;
      host = result.host;
      process.stdout.write(renderLiveStatus(rows, { all: options.all, host }));
    } catch {
      if (!stopped) process.stdout.write(renderLiveStatus(rows, { all: options.all, host }, new Date(), "daemon unreachable - retrying on next event"));
    }
  });
  const refresh = (): void => refreshController.trigger();
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    refreshController.stop();
    subscription?.close();
    resolveDone?.();
  };
  const onKey = (chunk: Buffer | string): void => {
    const input = chunk.toString();
    if (input.includes("q") || input.includes("\x1b") || input.includes(CTRL_C)) stop();
  };
  const onResize = (): void => refresh();
  const onSignal = (): void => stop();
  let subscription: EventSubscription | undefined;
  try {
    process.stdout.write(ENTER_ALT_SCREEN);
    subscription = subscribeEvents(orchDir(), {}, () => refresh());
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onKey);
    process.stdout.on("resize", onResize);
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    refresh();
    await done;
    process.exitCode = 0;
  } finally {
    subscription?.close();
    process.stdin.off("data", onKey);
    process.stdout.off("resize", onResize);
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write(EXIT_ALT_SCREEN);
  }
}
