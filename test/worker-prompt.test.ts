import { describe, expect, test } from "bun:test";
import { getAdapter } from "../src/adapters/registry.ts";
import { workerPrompt } from "../src/commands/spawn.ts";
import { workerHeaderFor } from "../src/worker-prompt.ts";
import { derivePresenceTransition } from "../src/daemon/events.ts";

describe("worker prompt capability composition", () => {
  test("orch run composition selects the same header per adapter", () => {
    expect(workerPrompt("task", false, getAdapter("codex"))).toBe(`${workerHeaderFor(getAdapter("codex"))}\n\ntask`);
    expect(workerPrompt("task", false, getAdapter("pi"))).toBe(`${workerHeaderFor(getAdapter("pi"))}\n\ntask`);
  });

  test("locked-commands clause names the commands when the list is non-empty", () => {
    const header = workerHeaderFor(getAdapter("pi"), { lockedCommands: ["bun test", "bun run check"] });
    expect(header).toContain("locked machine-wide: bun test, bun run check");
    expect(header).toContain("orch lock run -- <cmd>");
  });

  test("no locked-commands clause when the list is empty", () => {
    const header = workerHeaderFor(getAdapter("pi"), { lockedCommands: [] });
    expect(header).not.toContain("locked machine-wide");
  });

  test("the reply-to-spawner clause needs a reachable spawner, not just an inbox-steerable worker", () => {
    // pi has caps.steer === "inbox", so the worker CAN receive inbox writes. That says
    // nothing about whether whoever launched it can. Instructing the reply without a
    // live spawner inbox is what made every worker call orch_send and get refused.
    expect(workerHeaderFor(getAdapter("pi"), { spawnerRepliable: false })).not.toContain("orch_send");
    expect(workerHeaderFor(getAdapter("pi"), {})).not.toContain("orch_send");
    expect(workerHeaderFor(getAdapter("pi"), { spawnerRepliable: true })).toContain("orch_send target \"spawner\"");
  });

  test("a reachable spawner still earns no clause when the worker cannot be steered by inbox", () => {
    expect(workerHeaderFor(getAdapter("codex"), { spawnerRepliable: true })).not.toContain("orch_send");
  });

  test("events strip both worker header variants", () => {
    for (const adapter of ["codex", "pi"] as const) {
      const key = `${adapter}-events`;
      const states = new Map([[key, "working"]]);
      const event = derivePresenceTransition(key, {
        pid: process.pid,
        state: "done",
        task: workerPrompt("real task", false, getAdapter(adapter)),
      }, { name: null, tab: null }, states);
      expect(event?.task).toBe("real task");
    }
  });
});
