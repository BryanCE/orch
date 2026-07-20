import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { serializeIdentity } from "../src/backends/identity.ts";

const orchDir = mkdtempSync(join(tmpdir(), "orch-claude-adapter-"));
const previousOrchDir = process.env.ORCH_DIR;
const { claudeAdapter } = await import("../src/adapters/claude.ts");
const hookScript = join(import.meta.dir, "../extensions/claude/index.ts");
// The hook receives its identity only through the opaque serialized key.
const fakeKey = serializeIdentity({ backend: "herdr", workspace: "w9", handle: "p1" });

function agentDir(key: string): string {
  const directory = join(orchDir, "agents", key);
  mkdirSync(directory, { recursive: true });
  return directory;
}

function runHook(event: string, key: string, input: Record<string, unknown> = {}): Record<string, unknown> {
  const hookOrchDir = mkdtempSync(join(tmpdir(), "orch-claude-hook-"));
  try {
    execFileSync(process.execPath, [hookScript, event], {
      env: { ...process.env, ORCH_DIR: hookOrchDir, ORCH_AGENT_KEY: fakeKey },
      input: JSON.stringify(input),
      encoding: "utf8",
    });
    return JSON.parse(readFileSync(join(hookOrchDir, "agents", fakeKey, "status.json"), "utf8")) as Record<string, unknown>;
  } finally {
    rmSync(hookOrchDir, { recursive: true, force: true });
  }
}

function restoreOrchDir(): void {
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
}

beforeEach(() => {
  process.env.ORCH_DIR = orchDir;
});

afterEach(() => {
  rmSync(join(orchDir, "agents"), { recursive: true, force: true });
  restoreOrchDir();
});

afterAll(() => {
  rmSync(orchDir, { recursive: true, force: true });
  restoreOrchDir();
});

describe("Claude adapter", () => {
  test("declares its identity and capabilities", () => {
    expect(claudeAdapter.id).toBe("claude");
    expect(claudeAdapter.caps).toEqual({ steer: "keys", ask: false, setModel: false, sessionTail: true, enforcesCommandLocks: false, lifecycle: [] });
  });

  test("builds the interactive Claude launch command", () => {
    expect(claudeAdapter.interactiveCmd({})).toBe("claude");
  });

  test("pins headless print mode to the hook-driven presence path", () => {
    expect(claudeAdapter.hookDriven).toBe(true);
    expect(claudeAdapter.headlessCmd("reply", {})).toEqual(["claude", "-p", "reply"]);
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

  test("reads the final assistant text from a Stop-hook transcript", () => {
    const key = "claude-session-view";
    const transcript = join(agentDir(key), "stop-hook-session.jsonl");
    writeFileSync(transcript, [
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Earlier answer" }] } }),
      "not-json hook noise",
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Final answer" }] } }),
    ].join("\n") + "\n");

    expect(claudeAdapter.extractResult({ key, sessionPath: transcript })).toBe("Final answer");
    expect(claudeAdapter.readSessionView?.({ sessionPath: transcript })).toEqual({ lastText: "Final answer" });
  });

  test("maps Claude hook events to presence states and schema", () => {
    const key = "claude-hooks";
    expect(runHook("SessionStart", key, { pid: process.pid, session_id: "s1" })).toMatchObject({ schema: 2, agent: "claude", key: fakeKey, pid: process.pid, state: "working" });
    expect(runHook("Notification", key, { pid: process.pid, message: "Approval needed" })).toMatchObject({ schema: 2, agent: "claude", state: "blocked", blockedMessage: "Approval needed" });
    expect(runHook("Stop", key, { pid: process.pid })).toMatchObject({ schema: 2, agent: "claude", state: "idle" });

    const transcript = join(agentDir(key), "session.jsonl");
    writeFileSync(transcript, `${JSON.stringify({ role: "assistant", content: "Finished" })}\n`);
    expect(runHook("Stop", key, { pid: process.pid, transcript_path: transcript })).toMatchObject({ schema: 2, agent: "claude", state: "done" });
  }, 20_000);

  test("exits silently and writes no presence without ORCH_AGENT_KEY (a non-orch session)", () => {
    const hookOrchDir = mkdtempSync(join(tmpdir(), "orch-claude-hook-"));
    try {
      const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: hookOrchDir };
      delete env.ORCH_AGENT_KEY;
      expect(() => execFileSync(process.execPath, [hookScript, "SessionStart"], {
        env,
        input: JSON.stringify({ pid: process.pid }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      })).not.toThrow();
      expect(existsSync(join(hookOrchDir, "agents"))).toBe(false);
    } finally {
      rmSync(hookOrchDir, { recursive: true, force: true });
    }
  });

  test("fails hard and writes no presence on a malformed ORCH_AGENT_KEY", () => {
    const hookOrchDir = mkdtempSync(join(tmpdir(), "orch-claude-hook-"));
    try {
      const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: hookOrchDir, ORCH_AGENT_KEY: "garbage" };
      expect(() => execFileSync(process.execPath, [hookScript, "SessionStart"], {
        env,
        input: JSON.stringify({ pid: process.pid }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      })).toThrow();
      expect(existsSync(join(hookOrchDir, "agents"))).toBe(false);
    } finally {
      rmSync(hookOrchDir, { recursive: true, force: true });
    }
  });
});
