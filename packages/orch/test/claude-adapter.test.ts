import { execFileSync } from "node:child_process";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId, serializeIdentity } from "../src/backends/identity.ts";
// Imported FIRST on purpose, and for its evaluation order alone: reaching
// adapters/claude.ts as the ENTRY point makes it the head of the pre-existing
// config.ts -> runtime.ts -> adapters/registry.ts -> claude.ts import cycle, and
// registry.ts then reads `claudeAdapter` inside its own TDZ. Entering at the
// registry evaluates claude.ts as one of its dependencies instead.
import "../src/adapters/registry.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { readJsonRecord } from "./helpers/json.ts";

const orchDir = mkdtempSync(join(tmpdir(), "orch-claude-adapter-"));
const previousOrchDir = process.env.ORCH_DIR;
const previousAgentKey = process.env[LAUNCH_ENV];
const hookScript = join(import.meta.dir, "../extensions/claude/index.ts");
// A1: the hook receives its identity through launch env, and that key is the
// minted id alone — no plexer, no space, nothing for the hook to decode.
const fakeKey = serializeIdentity({ id: mintAgentId() });

function agentDir(key: string): string {
  const directory = join(orchDir, "agents", key);
  mkdirSync(directory, { recursive: true });
  return directory;
}

/** The hook always runs under `fakeKey`; a test's own key only names its transcript file. */
function runHook(event: string, input: Record<string, unknown> = {}): Record<string, unknown> {
  const hookOrchDir = mkdtempSync(join(tmpdir(), "orch-claude-hook-"));
  try {
    execFileSync(process.execPath, [hookScript, event], {
      env: { ...process.env, ORCH_DIR: hookOrchDir, [LAUNCH_ENV]: fakeKey },
      input: JSON.stringify(input),
      encoding: "utf8",
    });
    return readJsonRecord(join(hookOrchDir, "agents", fakeKey, "status.json"));
  } finally {
    removeTempDir(hookOrchDir);
  }
}

function restoreEnvironment(): void {
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
  if (previousAgentKey === undefined) delete process.env[LAUNCH_ENV];
  else process.env[LAUNCH_ENV] = previousAgentKey;
}

beforeEach(() => {
  process.env.ORCH_DIR = orchDir;
  // Hook launches state identity explicitly; the adapter test session has none.
  delete process.env[LAUNCH_ENV];
});

afterEach(() => {
  rmSync(join(orchDir, "agents"), { recursive: true, force: true });
  restoreEnvironment();
});

afterAll(() => {
  removeTempDir(orchDir);
  restoreEnvironment();
});

describe("Claude adapter", () => {
  test("declares its identity, and composes only the roles it fully implements", () => {
    expect(claudeAdapter.id).toBe("claude");
    // Claude reads a native transcript and registers presence on start...
    expect(claudeAdapter.sessionView).not.toBeNull();
    expect(claudeAdapter.presenceRegistration).not.toBeNull();
    // ...and composes NOTHING for what it cannot do. An absent role is the whole
    // capability statement: no stub, no "unsupported" return, no boolean (E13).
    expect(claudeAdapter.inboxSteering).toBeNull();
    expect(claudeAdapter.question).toBeNull();
    expect(claudeAdapter.modelControl).toBeNull();
    expect(claudeAdapter.lifecycleControl).toBeNull();
  });

  test("builds the interactive Claude launch command", () => {
    expect(claudeAdapter.interactiveCmd({})).toBe("claude");
  });

  test("pins headless print mode to the hook-driven presence path", () => {
    expect(claudeAdapter.hookDriven).toBe(true);
    expect(claudeAdapter.headlessCmd("reply", {})).toEqual(["claude", "-p", "reply"]);
  });

  test("detects state from a live presence status", () => {
    const key = "claudestt1";
    writeFileSync(join(agentDir(key), "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA, agent: "claude", pid: process.pid, state: "working" }));
    expect(claudeAdapter.detectState({ key })).toBe("working");
  });

  test("extracts result.json before transcript and native output", () => {
    const key = "claudersl1";
    const directory = agentDir(key);
    const transcript = join(directory, "transcript.jsonl");
    writeFileSync(join(directory, "result.json"), JSON.stringify({ text: "result text" }));
    writeFileSync(transcript, `${JSON.stringify({ role: "assistant", content: [{ type: "text", text: "transcript text" }] })}\n`);

    expect(claudeAdapter.extractResult({ key, sessionPath: transcript, output: "native text" })).toBe("result text");
    rmSync(join(directory, "result.json"));
    expect(claudeAdapter.extractResult({ key, sessionPath: transcript, output: "native text" })).toBe("transcript text");
  });

  test("reads the final assistant text from a Stop-hook transcript", () => {
    const key = "claudesvw1";
    const transcript = join(agentDir(key), "stop-hook-session.jsonl");
    writeFileSync(transcript, [
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Earlier answer" }] } }),
      "not-json hook noise",
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Final answer" }] } }),
    ].join("\n") + "\n");

    expect(claudeAdapter.extractResult({ key, sessionPath: transcript })).toBe("Final answer");
    expect(claudeAdapter.readSessionView?.({ sessionPath: transcript })).toEqual({ lastText: "Final answer" });
  });

  test("shim and adapter extract identical text from one transcript (empty-string parts)", () => {
    const key = "claudeshr1";
    const transcript = join(agentDir(key), "shared.jsonl");
    // The final assistant carries an empty-string part beside a real one — the
    // exact divergence D4 collapsed onto the adapter's `part !== undefined`
    // filter. Both readers now route through src/adapters/transcript.ts, so the
    // subprocess shim and the in-process adapter must agree byte-for-byte.
    writeFileSync(transcript, JSON.stringify({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "text", text: "" }, { type: "text", text: "shared answer" }] },
    }) + "\n");
    const adapterText = claudeAdapter.readSessionView?.({ sessionPath: transcript })?.lastText;
    expect(adapterText).toBe("shared answer");
    const status = runHook("Stop", { pid: process.pid, transcript_path: transcript });
    expect(status.lastText).toBe(adapterText);
  }, 20_000);

  test("maps Claude hook events to presence states and schema", () => {
    const key = "claude-hooks";
    expect(runHook("SessionStart", { pid: process.pid, session_id: "s1" })).toMatchObject({ schema: PRESENCE_SCHEMA, agent: "claude", key: fakeKey, pid: process.pid, state: "working" });
    expect(runHook("Notification", { pid: process.pid, message: "Approval needed" })).toMatchObject({ schema: PRESENCE_SCHEMA, agent: "claude", state: "blocked", blockedMessage: "Approval needed" });
    expect(runHook("Stop", { pid: process.pid })).toMatchObject({ schema: PRESENCE_SCHEMA, agent: "claude", state: "idle" });

    const transcript = join(agentDir(key), "session.jsonl");
    writeFileSync(transcript, `${JSON.stringify({ role: "assistant", content: "Finished" })}\n`);
    expect(runHook("Stop", { pid: process.pid, transcript_path: transcript })).toMatchObject({ schema: PRESENCE_SCHEMA, agent: "claude", state: "done" });
  }, 20_000);

  test("exits silently and writes no presence without launch env (a non-orch session)", () => {
    const hookOrchDir = mkdtempSync(join(tmpdir(), "orch-claude-hook-"));
    try {
      const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: hookOrchDir };
      delete env[LAUNCH_ENV];
      expect(() => execFileSync(process.execPath, [hookScript, "SessionStart"], {
        env,
        input: JSON.stringify({ pid: process.pid }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      })).not.toThrow();
      expect(existsSync(join(hookOrchDir, "agents"))).toBe(false);
    } finally {
      removeTempDir(hookOrchDir);
    }
  });

  test("fails hard and writes no presence on a malformed launch env", () => {
    const hookOrchDir = mkdtempSync(join(tmpdir(), "orch-claude-hook-"));
    try {
      const env: Record<string, string | undefined> = { ...process.env, ORCH_DIR: hookOrchDir, [LAUNCH_ENV]: "garbage" };
      expect(() => execFileSync(process.execPath, [hookScript, "SessionStart"], {
        env,
        input: JSON.stringify({ pid: process.pid }),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      })).toThrow();
      expect(existsSync(join(hookOrchDir, "agents"))).toBe(false);
    } finally {
      removeTempDir(hookOrchDir);
    }
  });
});
