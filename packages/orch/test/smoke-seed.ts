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
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { ensurePresenceAgentDir, writeResult, writeStatus } from "../src/presence/writer.ts";
import { isAgentId } from "../src/backends/identity.ts";

const [key, pidText] = process.argv.slice(2);
if (!isAgentId(key) || pidText === undefined || !/^[1-9][0-9]*$/.test(pidText)) {
  console.error("usage: bun test/smoke-seed.ts <agent-id> <live-pid>");
  process.exit(2);
}

const root = envOrchDir();
const now = new Date().toISOString();
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

const directory = ensurePresenceAgentDir(key, root);
if (directory === undefined) {
  console.error(`cannot create the presence directory for ${key} under ${root}`);
  process.exit(1);
}

writeStatus(directory, {
  schema: PRESENCE_SCHEMA,
  agent: "pi",
  key,
  cwd,
  state: "asking",
  asking: { question: "Proceed with the fixture?", id: "q-fixture", ts: now },
  model: { provider: "openai-codex", id: "gpt-5" },
  thinking: "medium",
  cost: 12.34,
  context: { percent: 42 },
  task: "Exercise the smoke fixture",
  lastText: "Fixture is healthy",
  tokens: { input: 10, output: 20 },
  turns: 3,
  updatedAt: now,
});
writeResult(directory, { text: "Fixture result", ts: "2020-01-01T00:00:00.000Z" });
