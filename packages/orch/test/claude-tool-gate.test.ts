import { describe, expect, test } from "bun:test";
import { preToolUse, type GateSettings } from "../extensions/claude/tool-gate.ts";
import { CLAUDE_TOOLS } from "../extensions/claude/vocabulary.ts";
import type { WriteRootGate } from "../src/policy/write-root.ts";
import { isRecord } from "../src/util.ts";

const LOCK_WAIT_MS = 180_000;
const settings: GateSettings = {
  locked_commands: { commands: ["bun test"], applies_to: ["orch", "slave"] },
  gated_commands: [],
  denied_commands: { commands: [], applies_to: ["slave"] },
  timeouts: { lock_wait_ms: LOCK_WAIT_MS },
};
const root = "/repo/.orch/councils/plan/ada";
const cwd = "/repo";
const gate: WriteRootGate = { root, cwd, tools: CLAUDE_TOOLS };

describe("Claude tool gate", () => {
  test("leaves calls alone without a write root, except locked Bash", () => {
    expect(preToolUse({ tool_name: "Write", tool_input: { file_path: "/repo/src/a.ts", content: "x" } }, settings, null)).toBeUndefined();
    expect(preToolUse({ tool_name: "Bash", tool_input: { command: "ls" } }, settings, null)).toBeUndefined();
    const result = preToolUse({ tool_name: "Bash", tool_input: { command: "bun test", timeout: 1000 } }, settings, null);
    const output = isRecord(result?.hookSpecificOutput) ? result.hookSpecificOutput : {};
    const updated = isRecord(output.updatedInput) ? output.updatedInput : {};
    expect(output.hookEventName).toBe("PreToolUse");
    expect(updated.command).toMatch(/ lock -- 'bun test'$/);
    expect(updated.timeout).toBe(1000 + LOCK_WAIT_MS);
  });

  test("refuses calls outside the write root", () => {
    expect(preToolUse({ tool_name: "Write", tool_input: { file_path: `${root}/round-1.md`, content: "x" } }, settings, gate)).toBeUndefined();
    expect(preToolUse({ tool_name: "Read", tool_input: { file_path: "/repo/src/a.ts" } }, settings, gate)).toBeUndefined();
    expect(preToolUse({ tool_name: "Edit", tool_input: { file_path: "src/a.ts" } }, settings, gate)).toEqual({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "orch refused this write: /repo/src/a.ts is outside /repo/.orch/councils/plan/ada, the only directory this agent may write in." } });
    const denial = { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `orch refused this tool: this agent only reads files, and writes only inside ${root}.` } };
    expect(preToolUse({ tool_name: "Bash", tool_input: { command: "ls" } }, settings, gate)).toEqual(denial);
    expect(preToolUse({ tool_name: "NotebookEdit", tool_input: { notebook_path: "/repo/a.ipynb" } }, settings, gate)).toEqual(denial);
  });
});
