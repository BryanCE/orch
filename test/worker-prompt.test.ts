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
    const header = workerHeaderFor(getAdapter("pi"), ["bun test", "bun run check"]);
    expect(header).toContain("locked machine-wide: bun test, bun run check");
    expect(header).toContain("orch lock run -- <cmd>");
  });

  test("no locked-commands clause when the list is empty", () => {
    const header = workerHeaderFor(getAdapter("pi"), []);
    expect(header).not.toContain("locked machine-wide");
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
