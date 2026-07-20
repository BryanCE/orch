import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAdapter } from "../src/adapters/registry.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { addTask, listTasks } from "../src/queue.ts";
import { recordSpawned, presenceAgentDir } from "../src/store.ts";
import { runWorkLoop } from "../src/work.ts";
import { workerHeaderFor } from "../src/worker-prompt.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { derivePresenceTransition } from "../src/daemon/events.ts";

void mock.module("../src/commands/daemon.ts", () => ({
  parseGovernance: (args: string[]) => ({ gov: {}, rest: args }),
  writeRpc: () => Promise.resolve(undefined),
  ensureDaemon: () => Promise.resolve(),
}));

const { workerPrompt } = await import("../src/commands/spawn.ts");

type Deliver = typeof headlessBackend.deliver;

function statusFile(orchDir: string, key: string): string {
  const dir = presenceAgentDir(key, orchDir);
  mkdirSync(dir, { recursive: true });
  return join(dir, "status.json");
}

async function dispatchedPrompt(adapter: "codex" | "pi"): Promise<string> {
  const previousOrchDir = process.env.ORCH_DIR;
  const orchDir = mkdtempSync(join(tmpdir(), `orch-worker-prompt-${adapter}-`));
  const key = serializeIdentity({ backend: "headless", workspace: "local", handle: `${adapter}-worker` });
  const status = statusFile(orchDir, key);
  const original: Deliver = headlessBackend.deliver.bind(headlessBackend);
  let received = "";
  process.env.ORCH_DIR = orchDir;
  writeFileSync(status, JSON.stringify({ schema: PRESENCE_SCHEMA, agent: adapter, pid: process.pid, state: "idle" }));
  recordSpawned(key, { adapter, backend: "headless", handle: key });
  addTask(orchDir, "do the task", { agent: adapter }, "local");
  headlessBackend.deliver = (_handle, payload) => {
    received = payload.text;
    writeFileSync(status, JSON.stringify({ schema: PRESENCE_SCHEMA, agent: adapter, pid: process.pid, state: "working" }));
    setTimeout(() => writeFileSync(status, JSON.stringify({ schema: PRESENCE_SCHEMA, agent: adapter, pid: process.pid, state: "done" })), 1);
    return true;
  };
  try {
    await runWorkLoop({ orchDir, pollIntervalMs: 1, json: true });
    expect(listTasks(orchDir)[0]?.state).toBe("done");
    return received;
  } finally {
    headlessBackend.deliver = original;
    if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
    else process.env.ORCH_DIR = previousOrchDir;
    removeTempDir(orchDir);
  }
}

describe("worker prompt capability composition", () => {
  test("work loop gives codex the base header without orch_ask", async () => {
    const prompt = await dispatchedPrompt("codex");
    expect(prompt).toBe(`${workerHeaderFor(getAdapter("codex"))}\n\ndo the task`);
    expect(prompt).not.toContain("orch_ask");
  });

  test("work loop gives pi the orch_ask header clause", async () => {
    const prompt = await dispatchedPrompt("pi");
    expect(prompt).toBe(`${workerHeaderFor(getAdapter("pi"))}\n\ndo the task`);
    expect(prompt).toContain("orch_ask");
  });

  test("orch run composition selects the same header per adapter", () => {
    expect(workerPrompt("task", false, getAdapter("codex"))).toBe(`${workerHeaderFor(getAdapter("codex"))}\n\ntask`);
    expect(workerPrompt("task", false, getAdapter("pi"))).toBe(`${workerHeaderFor(getAdapter("pi"))}\n\ntask`);
  });

  test("locked-commands clause names the commands when the list is non-empty", () => {
    const header = workerHeaderFor(getAdapter("pi"), ["bun test", "bun run check"]);
    expect(header).toContain("locked machine-wide: bun test, bun run check");
    expect(header).toContain("orch lock run -- <cmd>");
  });

  test("no locked-commands clause when the list is empty", () => {
    const header = workerHeaderFor(getAdapter("pi"), []);
    expect(header).not.toContain("locked machine-wide");
  });

  test("events strip both worker header variants", () => {
    for (const adapter of ["codex", "pi"] as const) {
      const key = `${adapter}-events`;
      const states = new Map([[key, "working"]]);
      const event = derivePresenceTransition(key, {
        pid: process.pid,
        state: "done",
        task: workerPrompt("real task", false, getAdapter(adapter)),
      }, { name: null, tab: null }, states);
      expect(event?.task).toBe("real task");
    }
  });
});
