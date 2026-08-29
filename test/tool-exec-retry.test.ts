import { afterEach, describe, expect, test } from "bun:test";
import { runTool, setToolExecutor } from "../src/backends/tool-exec.ts";
import type { ToolExecutor } from "../src/types/backend.ts";

/** A failure shaped like execFileSync's: a code on stderr is how every tool
 *  orch drives reports WHY it refused. */
function toolFailure(code: string): Error {
  return Object.assign(new Error(`tool refused: ${code}`), {
    status: 1,
    stderr: JSON.stringify({ error: { code } }),
  });
}

/** Answers with the queued outcomes in order, recording every attempt. */
function scriptedExecutor(outcomes: (string | Error)[]): { executor: ToolExecutor; calls: number } {
  const state = { calls: 0 };
  const executor: ToolExecutor = () => {
    const outcome = outcomes[state.calls];
    state.calls += 1;
    if (outcome instanceof Error) throw outcome;
    return outcome ?? "";
  };
  return { executor, get calls() { return state.calls; } };
}

const FAST = { attempts: 4, delayMs: 1, backoff: 2 };

// The executor is process-global, so a fake left installed is served to every
// other suite in this process. Restore it after each test, always.
afterEach(() => { setToolExecutor(null); });

describe("every command into a harness or plexer retries on timing, not on being wrong", () => {
  test("a transient refusal is reattempted until it succeeds", () => {
    const scripted = scriptedExecutor([toolFailure("agent_pane_busy"), toolFailure("agent_pane_busy"), "started"]);
    setToolExecutor(scripted.executor);
    const output = runTool("herdr", ["agent", "start", "a"], {
      ...FAST,
      retryable: (error) => String((error as { stderr?: string }).stderr).includes("agent_pane_busy"),
    });
    expect(output).toBe("started");
    expect(scripted.calls).toBe(3);
  });

  test("a failure the caller calls permanent is thrown on the FIRST attempt, never retried", () => {
    const scripted = scriptedExecutor([toolFailure("duplicate_name"), "never reached"]);
    setToolExecutor(scripted.executor);
    expect(() => runTool("herdr", ["agent", "start", "a"], {
      ...FAST,
      retryable: (error) => String((error as { stderr?: string }).stderr).includes("agent_pane_busy"),
    })).toThrow(/duplicate_name/);
    expect(scripted.calls).toBe(1);
  });

  test("a tool that never recovers exhausts the budget and reports how many attempts it cost", () => {
    const scripted = scriptedExecutor([
      toolFailure("agent_pane_busy"), toolFailure("agent_pane_busy"),
      toolFailure("agent_pane_busy"), toolFailure("agent_pane_busy"),
    ]);
    setToolExecutor(scripted.executor);
    expect(() => runTool("herdr", ["agent", "start", "a"], {
      ...FAST,
      retryable: () => true,
    })).toThrow(/4 attempts/);
    expect(scripted.calls).toBe(4);
  });

  test("the seam names no harness: the same policy drives a different binary", () => {
    const scripted = scriptedExecutor([toolFailure("server not ready"), "%3"]);
    setToolExecutor(scripted.executor);
    expect(runTool("tmux", ["split-window"], { ...FAST, retryable: () => true })).toBe("%3");
    expect(scripted.calls).toBe(2);
  });
});
