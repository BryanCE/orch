import { describe, expect, test } from "bun:test";
import { retryableErrorMessage, type AgentState } from "../src/backends/herdr/pane-socket.ts";
import { createPaneStateMachine } from "../src/backends/herdr/pane-state-machine.ts";

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorEvent(errorMessage: unknown): { messages: unknown[] } {
  return { messages: [{ role: "assistant", stopReason: "error", errorMessage }] };
}

describe("retryableErrorMessage classifier", () => {
  test("no assistant message → undefined", () => {
    expect(retryableErrorMessage({ messages: [] })).toBeUndefined();
    expect(retryableErrorMessage({})).toBeUndefined();
  });

  test("assistant that did not stop on error → undefined", () => {
    expect(retryableErrorMessage({ messages: [{ role: "assistant", stopReason: "stop" }] })).toBeUndefined();
  });

  test("error stop with non-retryable text → undefined", () => {
    expect(retryableErrorMessage(errorEvent("invalid request: bad tool schema"))).toBeUndefined();
  });

  test("error stop with retryable text → the message", () => {
    expect(retryableErrorMessage(errorEvent("Overloaded, please retry"))).toBe("Overloaded, please retry");
    expect(retryableErrorMessage(errorEvent("upstream connect error 503"))).toBe("upstream connect error 503");
    expect(retryableErrorMessage(errorEvent("socket hang up"))).toBe("socket hang up");
  });

  test("non-string retryable errorMessage is stringified before matching", () => {
    expect(retryableErrorMessage(errorEvent({ detail: "rate limit exceeded" }))).toBe(
      JSON.stringify({ detail: "rate limit exceeded" }),
    );
  });

  test("only the last assistant turn is classified", () => {
    const event = {
      messages: [
        { role: "assistant", stopReason: "error", errorMessage: "overloaded" },
        { role: "user" },
        { role: "assistant", stopReason: "stop" },
      ],
    };
    expect(retryableErrorMessage(event)).toBeUndefined();
  });
});

describe("createPaneStateMachine state ordering", () => {
  function machineWithSink(idleDebounceMs: number, retryGraceMs: number) {
    const emitted: { state: AgentState; message?: string }[] = [];
    const machine = createPaneStateMachine({
      idleDebounceMs,
      retryGraceMs,
      enqueueState: (state, message) => emitted.push({ state, message }),
    });
    return { machine, emitted };
  }

  test("run → blocked → unblock → idle debounce", async () => {
    const { machine, emitted } = machineWithSink(0, 50);
    machine.startRun();
    machine.setBlocked(true, "waiting on input");
    machine.setBlocked(false, undefined);
    machine.endRun(undefined);
    await tick(5);
    expect(emitted).toEqual([
      { state: "working", message: undefined },
      { state: "blocked", message: "waiting on input" },
      { state: "working", message: undefined },
      { state: "idle", message: undefined },
    ]);
  });

  test("dedupes unchanged state", () => {
    const { machine, emitted } = machineWithSink(0, 50);
    machine.startRun();
    machine.startRun();
    expect(emitted).toEqual([{ state: "working", message: undefined }]);
  });

  test("retryable end holds working, then settles to blocked after grace", async () => {
    const { machine, emitted } = machineWithSink(0, 20);
    machine.startRun();
    machine.endRun("overloaded");
    // Still working during the grace hold — no new emit yet.
    expect(emitted).toEqual([{ state: "working", message: undefined }]);
    await tick(40);
    expect(emitted).toEqual([
      { state: "working", message: undefined },
      { state: "blocked", message: "overloaded" },
    ]);
  });

  test("duplicate end after settling does not publish a false idle", async () => {
    const { machine, emitted } = machineWithSink(0, 50);
    machine.startRun();
    machine.endRun(undefined);
    await tick(5);
    // A second, late end while already idle must be ignored (agent no longer active).
    machine.endRun(undefined);
    await tick(5);
    expect(emitted).toEqual([
      { state: "working", message: undefined },
      { state: "idle", message: undefined },
    ]);
  });

  test("openSession forces a publish even when state is unchanged", () => {
    const { machine, emitted } = machineWithSink(0, 50);
    machine.openSession(true);
    machine.openSession(true);
    expect(emitted).toEqual([
      { state: "working", message: undefined },
      { state: "working", message: undefined },
    ]);
  });
});
