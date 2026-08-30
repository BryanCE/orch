import { describe, expect, test } from "bun:test";
import { ambiguousTargetRefusal, CommandRefusal } from "../src/refusal.ts";
import { resolveAgentView } from "../src/commands/target.ts";
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";

/**
 * TASKS/11-usage-bugs.md U3 — an ambiguous dispatch target printed a bare
 * unlabelled list:
 *
 *     herdr~w7~rvmofvm2wq  (fix)  pi
 *     herdr~w7~478kahm7dx  pi
 *
 * No statement of what was ambiguous, no suggested disambiguator, and the prompt
 * was silently discarded. A refusal a caller cannot act on costs them the turn:
 * it looks like output, so they read it as an answer rather than as "your
 * dispatch did not happen".
 *
 * There were THREE wordings for this one refusal — `entities.ts` printed a
 * candidate list with no advice at all, `resolveAgentView` said "address by id",
 * and `resolveLifecycleTarget` said "address by key" — for a fact A1 settles:
 * the key IS the id. Rule 9 forbids two mechanisms for one fact; this is one
 * builder, and every raiser uses it.
 */

const presence = (key: string, alive: boolean): PresenceEntry => ({ key, dir: key, status: null, result: null, alive });

function view(id: string, name: string): AgentView {
  return {
    id, name, label: null, harnessId: "pi", cwd: "/repo", createdAt: 1,
    spawnedBy: null, spawnedByName: null, rootAgentId: id, heldBy: null,
    environment: { plexer: null, handle: null, space: null, worktree: null, branch: null },
    tuning: { model: null, thinking: null },
    endedAt: null,
  };
}

describe("an ambiguous target names the failure and the way out (U3)", () => {
  test("the message names the failure, the target string, and every candidate", () => {
    const message = ambiguousTargetRefusal("port-roles", [
      { key: "keyaagent1", detail: "fix" },
      { key: "keybagent1", detail: null },
    ]).message;

    expect(message).toContain("Ambiguous target");
    // The exact string, quoted: a caller with several commands in flight has to
    // know WHICH one this is about.
    expect(message).toContain('"port-roles"');
    expect(message).toContain("keyaagent1");
    expect(message).toContain("keybagent1");
    // What was ambiguous about each is kept - it is how a human picks.
    expect(message).toContain("fix");
  });

  test("it says what to send instead, so the caller is not left guessing", () => {
    // The whole of U3: the old output was a list and nothing else, so it read as
    // a listing command's answer rather than as a refused command.
    const message = ambiguousTargetRefusal("port-roles", [{ key: "keyaagent1", detail: null }]).message;
    expect(message).toContain("address it by its key");
  });

  test("it is a refusal, not an exit — the caller can act on it", () => {
    expect(ambiguousTargetRefusal("x", [{ key: "keyaagent1", detail: null }])).toBeInstanceOf(CommandRefusal);
  });

  test("resolveAgentView raises that same one message", () => {
    let message = "";
    try {
      resolveAgentView(
        [view("keyaagent1", "worker"), view("keybagent1", "worker")],
        new Map([["keyaagent1", presence("keyaagent1", true)], ["keybagent1", presence("keybagent1", true)]]),
        "worker",
      );
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : String(error);
    }

    // One wording for one fact (A1: the key IS the id). "address by id" here and
    // "address by key" three functions away is the same refusal wearing two hats.
    expect(message).toContain("Ambiguous target");
    expect(message).toContain('"worker"');
    expect(message).toContain("address it by its key");
    expect(message).toContain("keyaagent1");
    expect(message).toContain("keybagent1");
  });
});
