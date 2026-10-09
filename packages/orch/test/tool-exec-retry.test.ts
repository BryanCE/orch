import { afterEach, describe, expect, test } from "bun:test";
import { observeToolExec, plexerExecOptions, runTool, runToolBestEffort } from "../src/backends/tool-exec.ts";
import { TMUX_RETRY } from "../src/backends/tmux/cli.ts";
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

afterEach(() => observeToolExec(() => undefined));

describe("every command into a harness or plexer retries on timing, not on being wrong", () => {
  test("observes each attempt at its end", () => {
    const observed: { attempt: number; ok: boolean; elapsedMs: number }[] = [];
    observeToolExec(({ attempt, ok, elapsedMs }) => observed.push({ attempt, ok, elapsedMs }));
    const scripted = scriptedExecutor([toolFailure("agent_pane_busy"), "started"]);

    expect(runTool("herdr", ["agent", "start", "a"], { ...FAST, retryable: () => true }, plexerExecOptions(),scripted.executor)).toBe("started");
    expect(observed.map(({ attempt, ok }) => ({ attempt, ok }))).toEqual([{ attempt: 1, ok: false }, { attempt: 2, ok: true }]);
    expect(observed.every(({ elapsedMs }) => typeof elapsedMs === "number")).toBe(true);
  });

  test("a transient refusal is reattempted until it succeeds", () => {
    const scripted = scriptedExecutor([toolFailure("agent_pane_busy"), toolFailure("agent_pane_busy"), "started"]);
    const output = runTool("herdr", ["agent", "start", "a"], {
      ...FAST,
      retryable: (error) => String((error as { stderr?: string }).stderr).includes("agent_pane_busy"),
    }, plexerExecOptions(),scripted.executor);
    expect(output).toBe("started");
    expect(scripted.calls).toBe(3);
  });

  test("a failure the caller calls permanent is thrown on the FIRST attempt, never retried", () => {
    const scripted = scriptedExecutor([toolFailure("duplicate_name"), "never reached"]);
    expect(() => runTool("herdr", ["agent", "start", "a"], {
      ...FAST,
      retryable: (error) => String((error as { stderr?: string }).stderr).includes("agent_pane_busy"),
    }, plexerExecOptions(),scripted.executor)).toThrow(/duplicate_name/);
    expect(scripted.calls).toBe(1);
  });

  test("a tool that never recovers exhausts the budget and reports how many attempts it cost", () => {
    const scripted = scriptedExecutor([
      toolFailure("agent_pane_busy"), toolFailure("agent_pane_busy"),
      toolFailure("agent_pane_busy"), toolFailure("agent_pane_busy"),
    ]);
    expect(() => runTool("herdr", ["agent", "start", "a"], {
      ...FAST,
      retryable: () => true,
    }, plexerExecOptions(),scripted.executor)).toThrow(/4 attempts/);
    expect(scripted.calls).toBe(4);
  });

  test("the seam names no harness: the same policy drives a different binary", () => {
    const scripted = scriptedExecutor([toolFailure("server not ready"), "%3"]);
    expect(runTool("tmux", ["split-window"], { ...FAST, retryable: () => true }, plexerExecOptions(),scripted.executor)).toBe("%3");
    expect(scripted.calls).toBe(2);
  });

  test("tmux with no server running fails once, never waiting on retries that cannot succeed", () => {
    const noServer = Object.assign(new Error("tmux failed"), { status: 1, stderr: "error connecting to /tmp/tmux-1000/default (No such file or directory)" });
    const scripted = scriptedExecutor([noServer, "%3"]);
    expect(runToolBestEffort("tmux", ["list-panes", "-a"], { ...TMUX_RETRY, delayMs: 1 }, plexerExecOptions(),scripted.executor)).toBeNull();
    expect(scripted.calls).toBe(1);

    const busy = scriptedExecutor([Object.assign(new Error("tmux failed"), { status: 1, stderr: "server busy" }), "%3"]);
    expect(runTool("tmux", ["split-window"], { ...TMUX_RETRY, delayMs: 1 }, plexerExecOptions(),busy.executor)).toBe("%3");
  });
});
