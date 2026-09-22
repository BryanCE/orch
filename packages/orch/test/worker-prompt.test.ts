import { afterEach, describe, expect, test } from "bun:test";
import { getAdapter } from "../src/adapters/registry.ts";
import { stripWorkerHeader, workerPrompt } from "../src/worker-prompt.ts";
import { workerHeaderFor } from "../src/worker-prompt.ts";
import { transitionEventFromRow } from "../src/daemon/server/status-events.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { seedAgent } from "./helpers/agent.ts";
import { statusRow } from "./helpers/presence.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

import type { OrchDir } from "../src/types/core.ts";
const orchDirs: OrchDir[] = [];

function makeTempOrchDir(): OrchDir {
  const directory = tempOrchDir("orch-worker-prompt-");
  orchDirs.push(directory);
  return directory;
}

afterEach(() => {
  while (orchDirs.length > 0) removeTempDir(orchDirs.pop()!);
});

describe("worker prompt capability composition", () => {
  test("spawn clause follows maySpawn and stripping preserves the task", () => {
    const never = workerPrompt("bare task", false, getAdapter("pi"), { maySpawn: false });
    expect(never.toLowerCase()).toContain("never spawn");
    expect(stripWorkerHeader(never)).toBe("bare task");

    const may = workerPrompt("bare task", false, getAdapter("pi"), { maySpawn: true });
    expect(may.toLowerCase()).toContain("you may `orch spawn`");
    expect(may.toLowerCase()).not.toContain("never spawn");
    expect(stripWorkerHeader(may)).toBe("bare task");
  });

  test("orch run composition selects the same header per adapter", () => {
    expect(workerPrompt("task", false, getAdapter("codex"))).toBe(`${workerHeaderFor(getAdapter("codex"))}\n\ntask`);
    expect(workerPrompt("task", false, getAdapter("pi"))).toBe(`${workerHeaderFor(getAdapter("pi"))}\n\ntask`);
  });

  // `orch lock` did not serialize anything: agents ran heavy commands concurrently
  // regardless, so the instruction cost tokens on every dispatch and bought nothing.
  // A rule the tool cannot enforce is worse than no rule — it teaches the worker
  // that orch's instructions are advisory.
  test("the worker header does not instruct a lock that does not lock", () => {
    const header = workerHeaderFor(getAdapter("pi"));
    expect(header).not.toContain("orch lock run");
    expect(header).toContain("Every orch verb (spawn, dispatch, steer, close, reset, status) stays forbidden");
    expect(header).toContain("Verify your own slice before you report it");
    expect(header.toLowerCase()).toContain("never spawn subagents");
  });

  // A pane is a plexer's word for one place an agent can be shown. A headless worker
  // has none, so a header that names one describes an environment the agent is not in.
  test("the header addresses the agent, and names no plexer furniture", () => {
    const header = workerHeaderFor(getAdapter("pi"), { maySpawn: true, spawnerRepliable: true });
    expect(header.toLowerCase()).not.toContain("pane");
    expect(header.toLowerCase()).not.toContain("workspace");
  });

  test("the verify clause names the configured commands, and asks for the repository's own when there are none", () => {
    const named = workerHeaderFor(getAdapter("pi"), { verifyCommands: ["bun check", "bun test"] });
    expect(named).toContain("Verify with: bun check, bun test.");
    expect(named).not.toContain("this repository already has");

    const unnamed = workerHeaderFor(getAdapter("pi"), { verifyCommands: [] });
    expect(unnamed).toContain("Run the tests and typechecks this repository already has.");
  });

  test("the header says nothing about the lock: the harness hook takes it", () => {
    const header = workerHeaderFor(getAdapter("pi"), { verifyCommands: ["bunx oxlint <files>"], gatedCommands: ["git push"] });
    expect(header).not.toContain("orch lock");
    expect(header).not.toContain("machine-wide");
  });

  test("gated-commands clause names the commands and asks for the request id", () => {
    const header = workerHeaderFor(getAdapter("pi"), { gatedCommands: ["git push"] });
    expect(header).toContain("need the human's approval: git push");
    expect(header).toContain("request id");
  });

  test("no command clauses when both lists are empty", () => {
    const header = workerHeaderFor(getAdapter("pi"), { gatedCommands: [] });
    expect(header).not.toContain("approval");
  });

  test("the reply-to-spawner clause needs a reachable spawner, not just a bridge-enabled worker", () => {
    // pi has a bridge, so the worker CAN receive control mail. That says nothing
    // about whether whoever launched it can. Instructing the reply without a live
    // spawner bridge is what made every worker call orch_send and get refused.
    expect(workerHeaderFor(getAdapter("pi"), { spawnerRepliable: false })).not.toContain("orch_send");
    expect(workerHeaderFor(getAdapter("pi"), {})).not.toContain("orch_send");
    expect(workerHeaderFor(getAdapter("pi"), { spawnerRepliable: true })).toContain("orch_send target \"spawner\"");
  });

  test("unreachable spawner tells the worker to finish and end without relaying", () => {
    const header = workerHeaderFor(getAdapter("pi"), { spawnerRepliable: false });
    expect(header).toContain("finish, write your result, END the turn");
    expect(header).toContain("your result is collected from your session/result file");
    expect(header).toContain("NEVER route a report through another agent");
  });

  test("reachable spawner permits replying to the spawner only", () => {
    const header = workerHeaderFor(getAdapter("pi"), { spawnerRepliable: true });
    expect(header).toContain("reply or report to it with orch_send target \"spawner\" ONLY");
    expect(header).toContain("never relay via siblings or other agents");
  });

  test("a reachable spawner still earns no clause when the worker has no bridge", () => {
    expect(workerHeaderFor(getAdapter("codex"), { spawnerRepliable: true })).not.toContain("orch_send");
  });

  test("the ask clause follows the bridge actions", () => {
    const adapter = getAdapter("pi");
    if (adapter === undefined) throw new Error("pi adapter missing");
    expect(workerHeaderFor(adapter)).toContain("orch_ask");
    const bridgeWithoutAnswer = fakeAdapter({
      bridge: { takes: ["dispatch", "steer", "model"] },
    });
    expect(workerHeaderFor(bridgeWithoutAnswer)).not.toContain("orch_ask");
  });

  test("events strip both worker header variants", () => {
    const orchDir = makeTempOrchDir();
    for (const adapter of ["codex", "pi"] as const) {
      const key = `${adapter}-events`;
      seedAgent(key, { adapter }, orchDir);
      const event = transitionEventFromRow(orchDir, statusRow({
        agentId: key,
        state: "done",
        task: workerPrompt("real task", false, getAdapter(adapter)),
      }), "working", "done");
      expect(event?.type).toBe("transition");
      if (event?.type !== "transition") throw new Error("expected transition event");
      expect(event.task).toBe("real task");
    }
  });
});
