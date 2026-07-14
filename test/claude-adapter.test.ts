import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";

const orchDir = mkdtempSync(join(tmpdir(), "orch-claude-adapter-"));
const previousOrchDir = process.env.ORCH_DIR;
process.env.ORCH_DIR = orchDir;
const { claudeAdapter } = await import("../src/adapters/claude.ts");
const hookScript = join(import.meta.dir, "../scripts/claude-hooks.ts");

function agentDir(key: string): string {
  const directory = join(orchDir, "agents", key);
  mkdirSync(directory, { recursive: true });
  return directory;
}

function runHook(event: string, key: string, input: Record<string, unknown> = {}): Record<string, any> {
  const hookOrchDir = mkdtempSync(join(tmpdir(), "orch-claude-hook-"));
  const fakePaneId = "w9:p1";
  try {
    execFileSync(process.execPath, [hookScript, event], {
      env: { ...process.env, ORCH_DIR: hookOrchDir, HERDR_PANE_ID: fakePaneId },
      input: JSON.stringify(input),
      encoding: "utf8",
    });
    return JSON.parse(readFileSync(join(hookOrchDir, "agents", fakePaneId, "status.json"), "utf8"));
  } finally {
    rmSync(hookOrchDir, { recursive: true, force: true });
  }
}

afterEach(() => {
  rmSync(join(orchDir, "agents"), { recursive: true, force: true });
});

afterAll(() => {
  rmSync(orchDir, { recursive: true, force: true });
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
});

describe("Claude adapter", () => {
  test("declares its identity and capabilities", () => {
    expect(claudeAdapter.id).toBe("claude");
    expect(claudeAdapter.caps).toEqual({ steer: "keys", ask: false, setModel: false, sessionTail: true });
  });

  test("builds the interactive Claude launch command", () => {
    expect(claudeAdapter.interactiveCmd({})).toBe("claude");
  });

  test("detects state from a live presence status", () => {
    const key = "claude-state";
    writeFileSync(join(agentDir(key), "status.json"), JSON.stringify({ schema: 2, agent: "claude", pid: process.pid, state: "working" }));
    expect(claudeAdapter.detectState({ key })).toBe("working");
  });

  test("extracts result.json before transcript and native output", () => {
    const key = "claude-result";
    const directory = agentDir(key);
    const transcript = join(directory, "transcript.jsonl");
    writeFileSync(join(directory, "result.json"), JSON.stringify({ text: "result text" }));
    writeFileSync(transcript, `${JSON.stringify({ role: "assistant", content: [{ type: "text", text: "transcript text" }] })}\n`);

    expect(claudeAdapter.extractResult({ key, sessionPath: transcript, output: "native text" })).toBe("result text");
    rmSync(join(directory, "result.json"));
    expect(claudeAdapter.extractResult({ key, sessionPath: transcript, output: "native text" })).toBe("transcript text");
  });

  test("maps Claude hook events to presence states and schema", () => {
    const key = "claude-hooks";
    expect(runHook("SessionStart", key, { pid: process.pid, session_id: "s1" })).toMatchObject({ schema: 2, agent: "claude", key: "w9:p1", pid: process.pid, state: "working" });
    expect(runHook("Notification", key, { pid: process.pid, message: "Approval needed" })).toMatchObject({ schema: 2, agent: "claude", state: "blocked", blockedMessage: "Approval needed" });
    expect(runHook("Stop", key, { pid: process.pid })).toMatchObject({ schema: 2, agent: "claude", state: "idle" });

    const transcript = join(agentDir(key), "session.jsonl");
    writeFileSync(transcript, `${JSON.stringify({ role: "assistant", content: "Finished" })}\n`);
    expect(runHook("Stop", key, { pid: process.pid, transcript_path: transcript })).toMatchObject({ schema: 2, agent: "claude", state: "done" });
  });
});
