import { recordingLogger } from "./helpers/logger.ts";
import { execFileSync } from "node:child_process";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { seedAgent } from "./helpers/agent.ts";
import { startRpcServer } from "../src/daemon/server/rpc.ts";
import { stubRpcHandlers } from "./helpers/rpc-handlers.ts";
import { testServices } from "./helpers/services.ts";
import type { ParamsOf } from "../src/daemon/client/protocol.ts";
import type { RpcServer } from "../src/types/daemon.ts";
import type { OrchDir } from "../src/types/core.ts";
import type { ModelCatalogue } from "../src/types/adapter.ts";
// Imported FIRST on purpose, and for its evaluation order alone: reaching
// adapters/claude.ts as the ENTRY point makes it the head of the pre-existing
// config.ts -> runtime.ts -> adapters/registry.ts -> claude.ts import cycle, and
// registry.ts then reads `claudeAdapter` inside its own TDZ. Entering at the
// registry evaluates claude.ts as one of its dependencies instead.
import "../src/adapters/registry.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { removeTempDir, tempOrchDir } from "../test/helpers/tempdir.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { claudeSettingsPath } from "../src/adapters/claude-hooks.ts";

const orchDir: OrchDir = tempOrchDir("orch-claude-adapter-");
writeSettingsFixture(orchDir, { daemon: { report_timeout_ms: 2000 } });
const previousOrchDir = process.env.ORCH_DIR;
const previousAgentKey = process.env[LAUNCH_ENV];
const hookScript = join(import.meta.dir, "../extensions/claude/index.ts");
// A1: the hook receives its identity through launch env, and that key is the
// minted id alone — no plexer, no space, nothing for the hook to decode.
const fakeKey = mintAgentId();

function agentDir(key: string): string {
  const directory = join(orchDir, "agents", key);
  mkdirSync(directory, { recursive: true });
  return directory;
}

/** The hook always runs under `fakeKey`; a test's own key only names its transcript file. */
type StatusReportParams = ParamsOf<"report-status">;
type ResultReportParams = ParamsOf<"report-result">;
type PromptReportParams = ParamsOf<"report-prompt">;
type QuestionParams = ParamsOf<"question">;

interface ReportCapture {
  readonly statuses: StatusReportParams[];
  readonly results: ResultReportParams[];
  readonly prompts: PromptReportParams[];
  readonly questions: QuestionParams[];
  readonly server: RpcServer;
}

/** `refusals` status reports are refused first, the way orchd refuses an agent the spawn has not registered yet. */
async function startReportServer(refusals = 0): Promise<ReportCapture> {
  const statuses: StatusReportParams[] = [];
  const results: ResultReportParams[] = [];
  const prompts: PromptReportParams[] = [];
  const questions: QuestionParams[] = [];
  let refused = 0;
  const server = await startRpcServer(orchDir, stubRpcHandlers({
    "report-status": (params) => {
      if (refused < refusals) {
        refused += 1;
        throw new Error(`agent ${params.key} does not exist`);
      }
      statuses.push(params);
      return { ok: true };
    },
    "report-result": (params) => { results.push(params); return { ok: true }; },
    "report-prompt": (params) => { prompts.push(params); return { ok: true }; },
    question: (params) => { questions.push(params); return { ok: true }; },
  }), { logger: recordingLogger().logger });
  return { statuses, results, prompts, questions, server };
}

async function runHook(event: string, input: Record<string, unknown> = {}): Promise<void> {
  const processChild = Bun.spawn([process.execPath, hookScript, event], {
    env: { ...process.env, ORCH_DIR: orchDir, [LAUNCH_ENV]: fakeKey },
    stdin: "pipe",
    stdout: "ignore",
    stderr: "ignore",
  });
  await processChild.stdin.write(JSON.stringify(input));
  await processChild.stdin.end();
  const code = await processChild.exited;
  if (code !== 0) throw new Error(`hook exited ${code}`);
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
    // Claude reads a native transcript, reports on start, and echoes each prompt it takes...
    expect(claudeAdapter.sessionView).not.toBeNull();
    expect(claudeAdapter.hooks?.reports).toEqual(["start", "prompt"]);
    // ...and composes NOTHING for what it cannot do. An absent role is the whole
    // capability statement: no stub, no "unsupported" return, no boolean (E13).
    expect(claudeAdapter.bridge).toBeNull();
    expect(claudeAdapter.modelControl).toBeNull();
    // A reset is `/clear`; Claude has no in-session reload or restart.
    expect(claudeAdapter.lifecycleControl?.lifecycleCmd("reset")).toEqual({ text: "/clear" });
    expect(claudeAdapter.lifecycleControl?.lifecycleCmd("reload")).toBeUndefined();
    expect(claudeAdapter.lifecycleControl?.lifecycleCmd("restart")).toBeUndefined();
  });

  test("lists the models Claude Code reports in its initialize control response", () => {
    const initialize = JSON.stringify({ type: "control_response", response: { subtype: "success", request_id: "models", response: { models: [
      { value: "opus", resolvedModel: "claude-opus-5-5", displayName: "Opus 5.5" },
      { value: "claude-opus-5", displayName: "Opus 5" },
      { value: "haiku" },
      { displayName: "no value" },
    ] } } });
    const asked: { bin: string; argv: readonly string[]; stdin?: string }[] = [];
    const catalogue: ModelCatalogue = {
      ...testServices({ orchDir }).models,
      read: (bin, argv, stdin) => { asked.push({ bin, argv, stdin }); return `{"type":"system"}\n${initialize}\n`; },
    };
    expect(claudeAdapter.models.listModels(catalogue)).toEqual([
      { spec: "opus", label: "Opus 5.5" },
      { spec: "claude-opus-5", label: "Opus 5" },
      { spec: "haiku" },
    ]);
    expect(asked[0]?.bin).toBe("claude");
    expect(JSON.parse(asked[0]?.stdin ?? "")).toMatchObject({ type: "control_request", request: { subtype: "initialize" } });
    expect(claudeAdapter.models.listModels({ ...catalogue, read: () => "" })).toEqual([]);
  });

  test("builds the interactive Claude launch command", () => {
    expect(claudeAdapter.interactiveCmd({})).toBe("claude");
  });

  test("loads orch-owned settings in interactive and headless launches", () => {
    const settingsPath = claudeSettingsPath(orchDir);
    expect(claudeAdapter.interactiveArgv({ orchDir })).toEqual(["claude", "--settings", settingsPath]);
    expect(claudeAdapter.headlessCmd("reply", { orchDir })).toEqual(["claude", "-p", "--settings", settingsPath, "reply"]);
  });

  test("pins headless print mode to the hook-driven presence path", () => {
    expect(claudeAdapter.headlessCmd("reply", {})).toEqual(["claude", "-p", "reply"]);
  });

  test("detects state from a live presence status", () => {
    const key = "claudestt1";
    seedAgent(key, { adapter: "claude" }, orchDir);
    recordAgentStatus(orchDir, key, { state: "working" }, Date.now());
    expect(claudeAdapter.detectState({ key }, orchDir)).toBe("working");
  });

  test("extracts results before transcript and native output", () => {
    const key = "claudersl1";
    seedAgent(key, { adapter: "claude" }, orchDir);
    recordAgentStatus(orchDir, key, { state: "working" }, Date.now());
    upsertRun(orchDir, { dispatchId: "claude-result", agentKey: key, state: "done", startedAt: Date.now(), result: "result text" });
    const transcript = join(agentDir(key), "transcript.jsonl");
    writeFileSync(transcript, `${JSON.stringify({ role: "assistant", content: [{ type: "text", text: "transcript text" }] })}\n`);

    expect(claudeAdapter.extractResult({ key, sessionPath: transcript, output: "native text" }, orchDir)).toBe("result text");
    upsertRun(orchDir, { dispatchId: "claude-result", agentKey: key, state: "done", startedAt: Date.now(), result: null });
    expect(claudeAdapter.extractResult({ key, sessionPath: transcript, output: "native text" }, orchDir)).toBe("transcript text");
  });

  test("reads the final assistant text from a Stop-hook transcript", () => {
    const key = "claudesvw1";
    const transcript = join(agentDir(key), "stop-hook-session.jsonl");
    writeFileSync(transcript, [
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Earlier answer" }] } }),
      "not-json hook noise",
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Final answer" }] } }),
    ].join("\n") + "\n");

    expect(claudeAdapter.extractResult({ key, sessionPath: transcript }, orchDir)).toBe("Final answer");
    expect(claudeAdapter.readSessionView?.({ sessionPath: transcript })).toEqual({ lastText: "Final answer" });
  });

  test("shim and adapter extract identical text from one transcript (empty-string parts)", async () => {
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
    const capture = await startReportServer();
    try {
      await runHook("Stop", { pid: process.pid, transcript_path: transcript });
      expect(capture.statuses[0]?.status).toMatchObject({ state: "done", lastText: adapterText, sessionPath: transcript });
      expect(capture.results[0]?.result).toMatchObject({ text: adapterText, sessionPath: transcript });
    } finally {
      await capture.server.close();
    }
  }, 20_000);

  test("maps Claude hook events to presence reports", async () => {
    const key = "claude-hooks";
    const transcript = join(agentDir(key), "session.jsonl");
    writeFileSync(transcript, `${JSON.stringify({ role: "assistant", content: "stale transcript text" })}\n`);
    const capture = await startReportServer();
    try {
      await runHook("SessionStart", { session_id: "s1", source: "startup", model: "claude-haiku-5-5" });
      await runHook("UserPromptSubmit", { prompt: "do the task" });
      await runHook("Notification", { notification_type: "idle_prompt", message: "Claude is waiting for your input" });
      await runHook("Notification", { notification_type: "permission_prompt", message: "Approval needed" });
      await runHook("Stop", {});
      await runHook("Stop", { transcript_path: transcript, last_assistant_message: "Finished" });
      await runHook("Stop", { last_assistant_message: "Read the four callers.\nDo you want me to trace those four now?" });
      await runHook("StopFailure", { error: "rate_limit", error_details: "429 Too Many Requests" });
      expect(capture.statuses.map((report) => report.status.state)).toEqual(["idle", "asking", "done", "done", "asking", "error"]);
      expect(capture.statuses.every((report) => report.key === fakeKey)).toBe(true);
      expect(capture.statuses[0]?.status).toMatchObject({ sessionId: "s1", model: { provider: "anthropic", id: "claude-haiku-5-5" } });
      expect(capture.prompts).toEqual([{ key: fakeKey, prompt: "do the task" }]);
      expect(capture.statuses[1]?.status).toMatchObject({ blockedMessage: "Approval needed" });
      expect(capture.results).toHaveLength(1);
      expect(capture.results[0]).toMatchObject({ key: fakeKey, result: { text: "Finished", sessionPath: transcript } });
      expect(capture.questions).toHaveLength(1);
      expect(capture.questions[0]).toMatchObject({ notice: "question", agentId: fakeKey, question: "Do you want me to trace those four now?" });
      expect(capture.statuses[4]?.status).toMatchObject({ blockedMessage: "Do you want me to trace those four now?" });
      expect(capture.statuses[5]?.status).toMatchObject({ lastError: "rate_limit: 429 Too Many Requests" });
    } finally {
      await capture.server.close();
    }
  }, 30_000);

  test("retries the start report until the spawn has registered the agent", async () => {
    const capture = await startReportServer(2);
    try {
      await runHook("SessionStart", { session_id: "s2", source: "startup" });
      expect(capture.statuses.map((report) => report.status.state)).toEqual(["idle"]);
    } finally {
      await capture.server.close();
    }
  }, 20_000);

  test("keeps the run state across a compaction", async () => {
    const capture = await startReportServer();
    try {
      await runHook("SessionStart", { session_id: "s3", source: "compact" });
      expect(capture.statuses[0]?.status.state).toBeUndefined();
    } finally {
      await capture.server.close();
    }
  }, 20_000);

  test("exits silently and writes no presence without launch env (a non-orch session)", () => {
    const hookOrchDir = tempOrchDir("orch-claude-hook-");
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
    const hookOrchDir = tempOrchDir("orch-claude-hook-");
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
