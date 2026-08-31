import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { fakeAdapter as makeFakeAdapter } from "./helpers/adapter.ts";

/**
 * A plexer that launches an agent must hand it ORCH_PROJECT. Without it the
 * worker resolves `projectRoot()` to its own cwd
 * (`src/util.ts`), and in a worktree that is NOT the fleet's project, so
 * `peers.ts` walls the worker out of its own fleet.
 */
const execCalls: { file: string; args: string[] }[] = [];
const realChildProcess: typeof import("node:child_process") = await import("node:child_process");

void mock.module("node:child_process", () => ({
  ...realChildProcess,
  execFileSync: (file: string, args: string[] = [], options?: unknown): unknown => {
    execCalls.push({ file, args: [...args] });
    if (file !== "tmux") return realChildProcess.execFileSync(file, args, options as never);
    return args[0] === "split-window" || args[0] === "new-window" ? "%1\n" : "";
  },
}));

const { TmuxBackend } = await import("../src/backends/tmux/index.ts");

const FLEET_PROJECT = "/repo/main";
const WORKTREE = "/repo/wt-feature";
const originalProject = process.env.ORCH_PROJECT;
const originalTmux = process.env.TMUX;
const fakeAdapter = makeFakeAdapter();

function launchEnv(cmd: string): string[] {
  const args = execCalls.find((call) => call.file === "tmux" && call.args[0] === cmd)?.args ?? [];
  return args.flatMap((arg, index) => (args[index - 1] === "-e" ? [arg] : []));
}

beforeEach(() => {
  process.env.ORCH_PROJECT = FLEET_PROJECT;
  process.env.TMUX = "/tmp/fake-tmux,0,0";
  execCalls.length = 0;
});

afterEach(() => {
  if (originalProject === undefined) delete process.env.ORCH_PROJECT;
  else process.env.ORCH_PROJECT = originalProject;
  if (originalTmux === undefined) delete process.env.TMUX;
  else process.env.TMUX = originalTmux;
});

afterAll(() => { mock.restore(); });

describe("an agent is launched with its fleet's project scope (1.13)", () => {
  test("a tmux agent in a worktree carries the FLEET's project, not its own cwd", () => {
    new TmuxBackend().spawn(fakeAdapter, { key: "tmuxagent1", cwd: WORKTREE, group: "@1", split: "right", orchDir: "/orch" });

    expect(launchEnv("split-window")).toContain(`ORCH_PROJECT=${FLEET_PROJECT}`);
    expect(launchEnv("split-window")).not.toContain(`ORCH_PROJECT=${WORKTREE}`);
  });

  test("a tmux agent opened in a fresh window carries it too", () => {
    new TmuxBackend().spawn(fakeAdapter, { key: "tmuxagent2", cwd: WORKTREE, orchDir: "/orch" });

    expect(launchEnv("new-window")).toContain(`ORCH_PROJECT=${FLEET_PROJECT}`);
  });

  test("an empty value is dropped rather than exported as a configured blank", () => {
    new TmuxBackend().spawn(fakeAdapter, { key: "tmuxagent3", cwd: WORKTREE, group: "@1", orchDir: "" });

    expect(launchEnv("split-window").some((entry) => entry.startsWith("ORCH_DIR="))).toBe(false);
  });
});
