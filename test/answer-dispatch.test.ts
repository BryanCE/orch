import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import { deliverControl } from "../src/control/dispatch.ts";
import { governWrite } from "../src/daemon/orchd.ts";
import { setOwner } from "../src/store/ownership-rows.ts";
import { insertSpawnedRecord } from "../src/store/spawned-rows.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { rpcCall, startRpcServer, type RpcHandlers, type RpcServer } from "../src/daemon/rpc.ts";
import { refusalOf } from "./helpers/refusal.ts";

const originalOrchDir = process.env.ORCH_DIR;
const tempDirs: string[] = [];
const servers: RpcServer[] = [];

function tempDir(prefix = "orch-answer-"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function key(workspace: string, id: string): string {
  return serializeIdentity({ backend: "headless", workspace, id });
}

function answerFile(directory: string, agentKey: string): string {
  return path.join(directory, "agents", agentKey, "answer.json");
}

/** The exact wiring orchd registers for the `answer` method: wall + ownership, then dispatch. */
function answerHandlers(directory: string): RpcHandlers {
  return {
    answer: async (params) => {
      const value = params as { target?: unknown; text?: unknown };
      const target = String(value.target);
      const text = String(value.text);
      governWrite(directory, target, params);
      await deliverControl(target, { kind: "answer", text });
      return { ok: true };
    },
  };
}

async function startAnswerServer(directory: string): Promise<RpcServer> {
  const server = await startRpcServer(directory, answerHandlers(directory));
  servers.push(server);
  return server;
}

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  for (const dir of tempDirs.splice(0)) removeTempDir(dir);
});

describe("answer via the control dispatcher", () => {
  test("writes pi's answer.json through the adapter's answer port", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = key("local", "pi-answer");
    seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });

    await deliverControl(agentKey, { kind: "answer", text: "yes, ship it" });

    const line = JSON.parse(fs.readFileSync(answerFile(directory, agentKey), "utf8")) as { text: string };
    expect(line.text).toBe("yes, ship it");
  });

  // TASKS/02-scope.md E14: an adapter that takes no answers is an ABSENCE, and an
  // absence is an answer to a human, never a failure path. So this is outcome
  // "answer" with exit code zero — but it still has to NAME the target and the
  // harness, or the human learns nothing from it.
  test("answers, rather than failing, when the adapter composes no question role", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = key("local", "claude-noask");
    seedStatus(directory, agentKey, { agent: "claude", pid: process.pid });

    const result = await deliverControl(agentKey, { kind: "answer", text: "no" });
    // Narrow on the discriminant before reading the answer's text: `invoke` carries
    // none, and the union is what stops that being readable by accident.
    if (result.outcome !== "answer") throw new Error(`expected a boundary answer, got ${result.outcome}`);
    expect(result.reason).toBe("no-environment-role");
    expect(result.text).toMatch(new RegExp(`cannot answer .*${agentKey}.*adapter claude takes no answers`));
    expect(fs.existsSync(answerFile(directory, agentKey))).toBe(false);
  });

  test("refuses answer for a target with no recorded adapter identity", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = key("local", "identity-less");
    // A presence record with no `agent` field and no spawn-registry adapter is malformed, never pi.
    seedStatus(directory, agentKey, { pid: process.pid });

    expect(await refusalOf(deliverControl(agentKey, { kind: "answer", text: "yes" })))
      .toMatch(new RegExp(`${agentKey} has no recorded adapter`));
    expect(fs.existsSync(answerFile(directory, agentKey))).toBe(false);
  });
});

describe("answer over the daemon control socket", () => {
  test("delivers a pi answer end-to-end through the real socket", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = key("local", "socket-answer");
    seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });
    await startAnswerServer(directory);

    expect(await rpcCall(directory, "answer", { target: agentKey, text: "delivered" })).toEqual({ ok: true });

    const line = JSON.parse(fs.readFileSync(answerFile(directory, agentKey), "utf8")) as { text: string };
    expect(line.text).toBe("delivered");
  });

  test("refuses a cross-space answer at the daemon wall", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const foreign = key("wB", "foreign");
    const actor = key("wA", "boss");
    insertSpawnedRecord(directory, { pane: foreign, space: "wB" });
    insertSpawnedRecord(directory, { pane: actor, space: "wA" });
    seedStatus(directory, foreign, { agent: "pi", pid: process.pid });
    await startAnswerServer(directory);

    expect(await refusalOf(rpcCall(directory, "answer", { target: foreign, text: "yes", actor })))
      .toMatch(/space wall/);
    expect(fs.existsSync(answerFile(directory, foreign))).toBe(false);
  });

  test("refuses a non-owner answer, naming the owning orchestrator", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const agentKey = key("wA", "owned");
    seedStatus(directory, agentKey, { agent: "pi", pid: process.pid });
    setOwner(directory, agentKey, key("wA", "owner"));
    await startAnswerServer(directory);

    expect(await refusalOf(rpcCall(directory, "answer", { target: agentKey, text: "yes", actor: key("wA", "intruder") })))
      .toMatch(/owned by/);
    expect(fs.existsSync(answerFile(directory, agentKey))).toBe(false);
  });
});
