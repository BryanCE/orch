/**
 * Seed the smoke fixture: one live agent, written through the same store and
 * presence writers a real spawn uses.
 *
 * Rule 11: liveness is the recorded process, never a pid the agent writes about
 * itself, so a presence directory alone reads as a dead agent and `orch status`
 * hides it. The smoke shell passes its own pid, which is alive for exactly as
 * long as the checks run.
 *
 * usage: bun test/smoke-seed.ts <agent-id> <live-pid>   (ORCH_DIR set)
 */
import { envOrchDir } from "../src/services.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { mergeAgentStatus } from "../src/store/status-rows.ts";
import { upsertRun } from "../src/store/run-rows.ts";
import { isAgentId } from "../src/backends/identity.ts";

const [key, pidText] = process.argv.slice(2);
if (!isAgentId(key) || pidText === undefined || !/^[1-9][0-9]*$/.test(pidText)) {
  console.error("usage: bun test/smoke-seed.ts <agent-id> <live-pid>");
  process.exit(2);
}

const root = envOrchDir();
const now = new Date().toISOString();
const startedAt = Date.parse(now);
const dispatchId = "smoke-fixture";
const text = "Fixture result";
const cwd = "/tmp/smoke";

registerSpawnedAgent(root, {
  key,
  harnessId: "pi",
  placed: false,
  cwd,
  name: "smoke",
  model: "gpt-5",
  thinking: "medium",
  spawner: null,
  process: { pid: Number(pidText), startToken: null },
});

mergeAgentStatus(root, key, {
  state: "asking",
  dispatchId,
  model: { provider: "openai-codex", id: "gpt-5" },
  thinking: "medium",
  cost: 12.34,
  context: { tokens: 0, percent: 42 },
  task: "Exercise the smoke fixture",
  lastText: "Fixture is healthy",
  tokens: { input: 10, output: 20, cacheRead: 0, cacheWrite: 0 },
  turns: 3,
  startedAt,
  project: cwd,
}, Date.now());
upsertRun(root, { dispatchId, agentKey: key, state: "done", startedAt, result: text });
