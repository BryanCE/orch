import { afterEach, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readAgent, readAgentResult, readAgentTail } from "../src/agent/read.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { closeAllStores, drainWrites } from "../src/store/connection.ts";
import { recordAgentStatus } from "../src/presence/store.ts";
import { ensurePresenceAgentDir } from "../src/presence/history.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { hostIdentity } from "../src/host.ts";
import { recordingLogger } from "./helpers/logger.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
afterEach(() => {
  closeAllStores();
  for (const dir of dirs.splice(0)) removeTempDir(dir);
});

const logger = recordingLogger().logger;

/** A store holding one pi agent, alive through this runner's process. */
function storeWithAgent(): { orchDir: OrchDir; key: string } {
  const orchDir = tempOrchDir("orch-agent-read-");
  dirs.push(orchDir);
  const key = mintAgentId();
  registerSpawnedAgent(orchDir, {
    key, harnessId: "pi", placed: false, cwd: orchDir, name: "reader", model: "test", spawner: null,
    process: { pid: process.pid, startToken: `agent-read-${key}` }, host: hostIdentity(),
  });
  return { orchDir, key };
}

/** A pi session file for the agent: a task, a tool call, and two replies. */
function piSession(orchDir: OrchDir, key: string): string {
  const dir = ensurePresenceAgentDir(key, orchDir);
  if (dir === undefined) throw new Error("failed to create presence directory");
  const session = join(dir, "session.jsonl");
  writeFileSync(session, [
    JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:00Z", message: { role: "user", content: "first task" } }),
    JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:01Z", message: { role: "assistant", content: [{ type: "text", text: "working on it" }] } }),
    JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:02Z", message: { role: "assistant", content: [{ type: "toolCall", name: "bash", arguments: { command: "ls" } }] } }),
    JSON.stringify({ type: "message", timestamp: "2026-07-20T10:00:03Z", message: { role: "assistant", content: [{ type: "text", text: "final answer" }] } }),
  ].join("\n") + "\n");
  return session;
}

describe("reading an agent from the store that holds it", () => {
  test("answers the settled result of the dispatch the agent's status names", () => {
    const { orchDir, key } = storeWithAgent();
    recordAgentStatus(orchDir, key, { state: "done", dispatchId: "read-dispatch-1" }, Date.now());
    upsertRun(orchDir, { dispatchId: "read-dispatch-1", agentKey: key, state: "done", startedAt: Date.now(), result: "settled text" });
    drainWrites(orchDir);
    expect(readAgentResult(orchDir, key, logger)).toEqual({ kind: "found", source: "dispatch", payload: "settled text" });
  });

  test("says a running dispatch has not settled, naming the agent", () => {
    const { orchDir, key } = storeWithAgent();
    recordAgentStatus(orchDir, key, { state: "working", dispatchId: "read-dispatch-2" }, Date.now());
    upsertRun(orchDir, { dispatchId: "read-dispatch-2", agentKey: key, state: "working", startedAt: Date.now() });
    drainWrites(orchDir);
    const lookup = readAgentResult(orchDir, key, logger);
    expect(lookup.kind).toBe("missing");
    if (lookup.kind === "missing") expect(lookup.reason).toContain("has not settled (working)");
    if (lookup.kind === "missing") expect(lookup.reason).toContain("orch runs reader");
  });

  test("answers the newest run's result, then the harness session", () => {
    const history = storeWithAgent();
    upsertRun(history.orchDir, { dispatchId: "read-history-1", agentKey: history.key, state: "done", startedAt: Date.now(), result: "from history" });
    drainWrites(history.orchDir);
    expect(readAgentResult(history.orchDir, history.key, logger)).toEqual({ kind: "found", source: "presence", payload: "from history" });

    const session = storeWithAgent();
    recordAgentStatus(session.orchDir, session.key, { state: "done", sessionPath: piSession(session.orchDir, session.key) }, Date.now());
    const lookup = readAgentResult(session.orchDir, session.key, logger);
    expect(lookup).toMatchObject({ kind: "found", source: "session", payload: { text: "final answer" } });
  });

  test("an agent with nothing to report is missing, never empty", () => {
    const { orchDir, key } = storeWithAgent();
    expect(readAgentResult(orchDir, key, logger)).toMatchObject({ kind: "missing" });
  });

  test("a tail keeps the last entries asked for and the session path", () => {
    const { orchDir, key } = storeWithAgent();
    const sessionPath = piSession(orchDir, key);
    recordAgentStatus(orchDir, key, { state: "done", sessionPath }, Date.now());
    const lookup = readAgentTail(orchDir, key, 2, logger);
    if (lookup.kind !== "found") throw new Error(`expected a session, got: ${lookup.reason}`);
    expect(lookup.sessionPath).toBe(sessionPath);
    expect(lookup.view.entries?.map((entry) => entry.text ?? entry.toolCalls?.[0]?.name)).toEqual(["bash", "final answer"]);
  });

  test("a tail of an agent with no session file is missing", () => {
    const { orchDir, key } = storeWithAgent();
    expect(readAgent(orchDir, key, { kind: "tail", lines: 5 }, logger)).toMatchObject({ kind: "tail", lookup: { kind: "missing" } });
  });
});
