import { describe, expect, test } from "bun:test";
import { eventsScopeNotice, parseEventsOptions, startEventsLiveStream } from "../src/commands/events.ts";

describe("events scope notice", () => {
  test("names the default live scope and its wideners", () => {
    expect(eventsScopeNotice(parseEventsOptions([]))).toBe("watching my agents from now on - history: --since-seq 0; every session's agents: --any-agent");
  });

  test("names the all-agent live scope and its history widener", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--any-agent"]))).toBe("watching all agents from now on - history: --since-seq 0");
  });

  test("does not announce when history was requested", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--since-seq", "12"]))).toBeNull();
  });

  test("writes one notice before starting the live transport", () => {
    const order: string[] = [];
    let writes = 0;
    startEventsLiveStream(parseEventsOptions([]), {
      writeNotice: (line) => {
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
    startEventsLiveStream(parseEventsOptions(["--since-seq", "12"]), {
      writeNotice: () => {
        writes++;
      },
      startTransport: () => () => undefined,
    });

    expect(writes).toBe(0);
  });

  test("does not announce when explicit targets were requested", () => {
    expect(eventsScopeNotice(parseEventsOptions(["--agent-id=worker"]))).toBeNull();
  });
});
