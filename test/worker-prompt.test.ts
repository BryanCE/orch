import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAdapter } from "../src/adapters/registry.ts";
import { workerPrompt } from "../src/commands/spawn.ts";
import { workerHeaderFor } from "../src/worker-prompt.ts";
import { derivePresenceTransition } from "../src/daemon/events.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const orchDirs: string[] = [];

function tempOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-worker-prompt-"));
  orchDirs.push(directory);
  return directory;
}

afterEach(() => {
  while (orchDirs.length > 0) removeTempDir(orchDirs.pop()!);
});

describe("worker prompt capability composition", () => {
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
    expect(header).toContain("Run your own tests and typechecks directly in this pane");
    expect(header).toContain("never spawn subagents");
  });

  test("locked-commands clause names the commands, and asks for a report rather than a lock", () => {
    const header = workerHeaderFor(getAdapter("pi"), { lockedCommands: ["bun test", "bun run check"] });
    expect(header).toContain("locked machine-wide: bun test, bun run check");
    expect(header).not.toContain("orch lock run");
  });

  test("no locked-commands clause when the list is empty", () => {
    const header = workerHeaderFor(getAdapter("pi"), { lockedCommands: [] });
    expect(header).not.toContain("locked machine-wide");
  });

  test("the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker", () => {
    // pi has capabilities.steer === "inbox", so the worker CAN receive inbox writes. That says
    // nothing about whether whoever launched it can. Instructing the reply without a
    // live spawner inbox is what made every worker call orch_send and get refused.
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

  test("a reachable spawner still earns no clause when the worker cannot be steered by inbox", () => {
    expect(workerHeaderFor(getAdapter("codex"), { spawnerRepliable: true })).not.toContain("orch_send");
  });

  test("events strip both worker header variants", () => {
    const orchDir = tempOrchDir();
    for (const adapter of ["codex", "pi"] as const) {
      const key = `${adapter}-events`;
      const states = new Map([[key, "working"]]);
      const event = derivePresenceTransition(orchDir, key, {
        pid: process.pid,
        state: "done",
        task: workerPrompt("real task", false, getAdapter(adapter)),
      }, { name: null, tab: null }, states);
      expect(event?.task).toBe("real task");
    }
  });
});
