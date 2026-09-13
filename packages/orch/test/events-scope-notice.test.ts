import { describe, expect, test } from "bun:test";
import { eventsScopeNotice, parseEventsOptions, startEventsLiveStream } from "../src/commands/events.ts";
import type { EventsTransport } from "../src/commands/events.ts";
import type { ResolvedCallerScope } from "../src/types/policy.ts";

/** What `resolveCallerScope` hands the notice: an ownership filter and the address it
 *  matches. The notice reads the resolved scope, never the flag the caller typed. */
const MINE: ResolvedCallerScope = { mine: true, address: "me" };
const ANY: ResolvedCallerScope = { mine: false, address: "me" };

describe("events scope notice", () => {
  test("names the default live scope and its wideners", () => {
    expect(eventsScopeNotice(parseEventsOptions([]), MINE, true)).toBe("watching my agents from now on");
  });

  test("names the all-agent live scope and its history widener", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--space-wide"]), ANY, true)).toBe("watching all agents from now on");
  });

  test("a redirected stream is a harness reading transitions, and gets no banner", () => {
    expect(eventsScopeNotice(parseEventsOptions([]), MINE, false)).toBeNull();
  });

  test("does not announce when history was requested", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--since-seq", "12"]), MINE)).toBeNull();
  });

  test("writes one notice before starting the live transport", () => {
    const order: string[] = [];
    let writes = 0;
    startEventsLiveStream(parseEventsOptions([]), MINE, {
      toTerminal: true,
      ownedAgents: () => 3,
      writeNotice: (line: string) => {
        writes++;
        order.push(`notice:${line}`);
      },
      startTransport: (): EventsTransport => {
        order.push("transport");
        return { done: Promise.resolve(), close: () => undefined };
      },
    });

    expect(writes).toBe(1);
    expect(order).toEqual(["notice:watching my agents from now on\n", "transport"]);
  });

  test("does not write a notice when history was requested", () => {
    let writes = 0;
    startEventsLiveStream(parseEventsOptions(["--since-seq", "12"]), MINE, {
      ownedAgents: () => 3,
      writeNotice: () => {
        writes++;
      },
      startTransport: () => ({ done: Promise.resolve(), close: () => undefined }),
    });

    expect(writes).toBe(0);
  });

  /** A watch armed by a session that owns nothing can never fire. Three minutes of
   *  an empty monitor is indistinguishable from a dead daemon, so the stream says
   *  it — to a person and to a harness alike, and whether or not history was asked
   *  for, because the emptiness outlives the replay. */
  test("says so when the caller owns no agents", () => {
    const lines: string[] = [];
    startEventsLiveStream(parseEventsOptions(["--since-seq", "0"]), MINE, {
      ownedAgents: () => 0,
      writeNotice: (line: string) => lines.push(line),
      startTransport: () => ({ done: Promise.resolve(), close: () => undefined }),
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("you own no agents");
    expect(lines[0]).toContain("--space-wide");
  });

  test("stays out of a --json stream, which a parser is reading", () => {
    const lines: string[] = [];
    startEventsLiveStream(parseEventsOptions(["--json"]), MINE, {
      ownedAgents: () => 0,
      writeNotice: (line: string) => lines.push(line),
      startTransport: () => ({ done: Promise.resolve(), close: () => undefined }),
    });

    expect(lines).toEqual([]);
  });

  test("does not announce when explicit targets were requested", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--agent-id=worker"]), MINE)).toBeNull();
  });
});
