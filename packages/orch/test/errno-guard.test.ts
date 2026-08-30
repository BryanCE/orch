import { describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { errnoCode } from "../src/util.ts";
import { isAgentState } from "../src/agent-state.ts";

// Nineteen sites reached into a caught `unknown` with `(error as NodeJS.ErrnoException).code`.
// A cast is not a check: a thrown string, a plain Error, or `null` all satisfy the
// compiler there and then read `.code` off something that has none. Rule 13 — the
// fix is a guard that VERIFIES the claim, in ONE place.
describe("errnoCode reads a syscall error code, and only a real one", () => {
  test("returns the code of a real node syscall error", () => {
    let thrown: unknown;
    try { mkdirSync("/definitely/not/a/real/path/orch-test"); } catch (error: unknown) { thrown = error; }
    expect(errnoCode(thrown)).toBe("ENOENT");
  });

  test("a plain Error carries no code, so there is none to report", () => {
    expect(errnoCode(new Error("boom"))).toBeUndefined();
  });

  test("a non-object never yields a code instead of crashing on it", () => {
    for (const value of [null, undefined, "ENOENT", 42, []]) {
      expect(errnoCode(value)).toBeUndefined();
    }
  });

  test("a code-shaped field of the wrong type is not a code", () => {
    expect(errnoCode({ code: 404 })).toBeUndefined();
  });
});

// The same cast-as-check appeared three times over AGENT_STATES: `includes(value as
// AgentState) ? value as AgentState : ...`. Casting the argument to make `includes`
// accept it defeats the very check being written.
describe("isAgentState verifies the state rather than asserting it", () => {
  test("accepts a declared state", () => {
    expect(isAgentState("idle")).toBe(true);
    expect(isAgentState("working")).toBe(true);
  });

  test("rejects anything not declared, including non-strings", () => {
    for (const value of ["IDLE", "busy", "", null, undefined, 1, {}]) {
      expect(isAgentState(value)).toBe(false);
    }
  });
});
