import { describe, expect, test } from "bun:test";
import { createEventBus } from "../src/daemon/server/event-bus.ts";
import type { Logger } from "../src/types/core.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

function event(): NotifyEvent {
  return {
    type: "closed",
    key: "agent",
    ts: "2025-01-01T00:00:00.000Z",
    agent: "agent",
    tab: null,
    model: null,
    oldState: "working",
    newState: "closed",
  };
}

function testLogger(warnings: string[]): Logger {
  const noop = (): void => undefined;
  const logger: Logger = {
    setLevel: noop,
    error: noop,
    warn: (name) => { warnings.push(name); },
    info: noop,
    debug: noop,
    trace: noop,
    forCorrelation: () => logger,
    forAgent: () => logger,
  };
  return logger;
}

describe("event bus", () => {
  test("a throwing handler does not stop later handlers and is logged once", () => {
    const warnings: string[] = [];
    const bus = createEventBus(testLogger(warnings));
    const received: NotifyEvent[] = [];
    bus.on(() => { throw new Error("boom"); });
    bus.on((value) => { received.push(value); });

    bus.emit(event());

    expect(received).toHaveLength(1);
    expect(warnings).toEqual(["events.handler-failed"]);
  });

  test("unsubscribe removes only its own handler", () => {
    const bus = createEventBus(testLogger([]));
    const received: string[] = [];
    const first = bus.on(() => { received.push("first"); });
    bus.on(() => { received.push("second"); });

    first();
    bus.emit(event());

    expect(received).toEqual(["second"]);
  });

  test("emit with no handlers is a no-op", () => {
    const bus = createEventBus(testLogger([]));
    expect(() => bus.emit(event())).not.toThrow();
  });
});
