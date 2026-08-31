import { describe, expect, test } from "bun:test";
import { eventsScopeNotice, parseEventsOptions, startEventsLiveStream } from "../src/commands/events.ts";
import type { ResolvedCallerScope } from "../src/types/policy.ts";

/** What `resolveCallerScope` hands the notice: an ownership filter and the address it
 *  matches. The notice reads the resolved scope, never the flag the caller typed. */
const MINE: ResolvedCallerScope = { mine: true, address: "me" };
const ANY: ResolvedCallerScope = { mine: false, address: "me" };

describe("events scope notice", () => {
  test("names the default live scope and its wideners", () => {
    expect(eventsScopeNotice(parseEventsOptions([]), MINE)).toBe("watching my agents from now on - history: --since-seq 0; every session's agents: --any-agent");
  });

  test("names the all-agent live scope and its history widener", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--any-agent"]), ANY)).toBe("watching all agents from now on - history: --since-seq 0");
  });

  test("does not announce when history was requested", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--since-seq", "12"]), MINE)).toBeNull();
  });

  test("writes one notice before starting the live transport", () => {
    const order: string[] = [];
    let writes = 0;
    startEventsLiveStream(parseEventsOptions([]), MINE, {
      writeNotice: (line: string) => {
        writes++;
        order.push(`notice:${line}`);
      },
      startTransport: () => {
        order.push("transport");
        return () => undefined;
      },
    });

    expect(writes).toBe(1);
    expect(order).toEqual(["notice:watching my agents from now on - history: --since-seq 0; every session's agents: --any-agent\n", "transport"]);
  });

  test("does not write a notice when history was requested", () => {
    let writes = 0;
    startEventsLiveStream(parseEventsOptions(["--since-seq", "12"]), MINE, {
      writeNotice: () => {
        writes++;
      },
      startTransport: () => () => undefined,
    });

    expect(writes).toBe(0);
  });

  test("does not announce when explicit targets were requested", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--agent-id=worker"]), MINE)).toBeNull();
  });
});
