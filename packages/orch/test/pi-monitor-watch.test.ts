import { describe, expect, test } from "bun:test";
import { Watches } from "../extensions/pi/monitor/watches.ts";
import type { BashOperations } from "@earendil-works/pi-coding-agent";
import type { Watch, WatchEnd, WatchLimits } from "../extensions/pi/monitor/watch.ts";

const LIMITS: WatchLimits = { batchMs: 10, maxEventsPerMinute: 3, tailLines: 4 };

/** A shell runner the test drives: it writes output when told, and exits when told. */
function fakeShell(): { run: BashOperations["exec"]; write: (text: string) => void; exit: (code: number | null) => void; aborted: () => boolean } {
  let onData: ((data: Buffer) => void) | undefined;
  let settle: ((value: { exitCode: number | null }) => void) | undefined;
  let signal: AbortSignal | undefined;
  return {
    run: (_command, _cwd, options) => {
      onData = options.onData;
      signal = options.signal;
      return new Promise((resolve) => { settle = resolve; });
    },
    write: (text) => onData?.(Buffer.from(text, "utf8")),
    exit: (code) => settle?.({ exitCode: code }),
    aborted: () => signal?.aborted === true,
  };
}

function watchWith(shell: ReturnType<typeof fakeShell>, timeoutMs: number | null = null): { watch: Watch; events: string[][]; ends: WatchEnd[] } {
  const events: string[][] = [];
  const ends: WatchEnd[] = [];
  const watch = new Watches(shell.run).start(
    { description: "test", command: "tail -f log", cwd: ".", timeoutMs },
    LIMITS,
    { onEvent: (_watch, lines) => events.push([...lines]), onEnd: (_watch, end) => ends.push(end) },
  );
  return { watch, events, ends };
}

describe("a watched command", () => {
  test("sends the lines that arrive within one batch window as one event", async () => {
    const shell = fakeShell();
    const { events } = watchWith(shell);
    shell.write("one\ntw");
    shell.write("o\nthree\n");
    await Bun.sleep(30);
    expect(events).toEqual([["one", "two", "three"]]);
  });

  test("sends the lines read before an exit, then how it ended", async () => {
    const shell = fakeShell();
    const { events, ends } = watchWith(shell);
    shell.write("last line without a newline");
    shell.exit(0);
    await Bun.sleep(5);
    expect(events).toEqual([["last line without a newline"]]);
    expect(ends).toEqual([{ kind: "exited", code: 0 }]);
  });

  test("is stopped when it sends more events a minute than its limit", async () => {
    const shell = fakeShell();
    const { watch, events, ends } = watchWith(shell);
    for (let event = 0; event < 4; event += 1) {
      shell.write(`line ${event}\n`);
      await Bun.sleep(20);
    }
    expect(events).toHaveLength(3);
    expect(ends).toEqual([{ kind: "flooded", limit: 3 }]);
    expect(watch.running).toBe(false);
    expect(shell.aborted()).toBe(true);
  });

  test("is stopped at its timeout, and never without one", async () => {
    const timed = fakeShell();
    const { ends } = watchWith(timed, 15);
    const open = fakeShell();
    const { watch } = watchWith(open);
    await Bun.sleep(40);
    expect(ends).toEqual([{ kind: "timed-out" }]);
    expect(timed.aborted()).toBe(true);
    expect(watch.running).toBe(true);
  });

  test("keeps only the newest lines for a view", async () => {
    const shell = fakeShell();
    const { watch } = watchWith(shell);
    shell.write("1\n2\n3\n4\n5\n6\n");
    await Bun.sleep(20);
    expect(watch.tail).toEqual(["3", "4", "5", "6"]);
  });

  test("ends once, however many times it is stopped", () => {
    const shell = fakeShell();
    const { watch, ends } = watchWith(shell);
    watch.halt({ kind: "stopped", by: "agent" });
    watch.halt({ kind: "stopped", by: "user" });
    shell.exit(null);
    expect(ends).toEqual([{ kind: "stopped", by: "agent" }]);
  });
});
