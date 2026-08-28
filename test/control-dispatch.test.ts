import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { deliverControl } from "../src/control/dispatch.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { recordSpawned } from "../src/presence/store.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import type { BackendId } from "../src/backends/backend.ts";
import { seedStatus } from "./helpers/presence.ts";
import { refusalOf } from "./helpers/refusal.ts";

/** Above every real pid on Linux and macOS, so pidAlive is deterministically false. */
const DEAD_PID = 0x7fffffff;

const originalOrchDir = process.env.ORCH_DIR;
const tempDirs: string[] = [];

function tempDir(prefix = "orch-control-dispatch-"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function target(backend: BackendId, id: string): string {
  return serializeIdentity({ backend, workspace: backend === "headless" ? "local" : "test", id });
}

function presence(directory: string, key: string, agent: string): string {
  seedStatus(directory, key, { agent, pid: process.pid });
  return path.join(directory, "agents", key);
}

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  for (const dir of tempDirs.splice(0)) removeTempDir(dir);
});

describe("deliverControl", () => {
  test("steers pi through its presence inbox", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "pi-inbox");
    const dir = presence(directory, key, "pi");

    return deliverControl(key, { kind: "steer", text: "check the inbox" }).then(() => {
      const line = JSON.parse(fs.readFileSync(path.join(dir, "inbox.jsonl"), "utf8")) as { text: string };
      expect(line.text).toBe("check the inbox");
    });
  });

  test("refuses to steer a pane awaiting an answer, naming the primitive that lands", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "pi-asking");
    const dir = presence(directory, key, "pi");
    seedStatus(directory, key, { agent: "pi", pid: process.pid, state: "asking" });

    // A steer at an asking pane is accepted by the inbox and then lost inside the
    // harness's blocked turn. Reporting success for it is the whole defect: the
    // orchestrator believes the question is answered, the pane stays `asking`, and
    // nothing in `orch status` contradicts the belief because there is no transition
    // to notice. Recovery cost two full reset + re-dispatch cycles.
    expect(await refusalOf(deliverControl(key, { kind: "steer", text: "the answer" }))).toMatch(/orch answer/);
    expect(fs.existsSync(path.join(dir, "inbox.jsonl"))).toBe(false);
  });

  test("still answers a pane awaiting an answer", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "pi-answerable");
    const dir = presence(directory, key, "pi");
    seedStatus(directory, key, { agent: "pi", pid: process.pid, state: "asking" });

    await deliverControl(key, { kind: "answer", text: "yes, pattern C" });
    const answer = JSON.parse(fs.readFileSync(path.join(dir, "answer.json"), "utf8")) as { text: string };
    expect(answer.text).toBe("yes, pattern C");
  });

  test("a run dispatch is not blocked by an asking pane", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "pi-run-asking");
    const dir = presence(directory, key, "pi");
    seedStatus(directory, key, { agent: "pi", pid: process.pid, state: "asking" });

    await deliverControl(key, { kind: "run", text: "next slice" });
    const line = JSON.parse(fs.readFileSync(path.join(dir, "inbox.jsonl"), "utf8")) as { text: string };
    expect(line.text).toBe("next slice");
  });

  test("does not fall back from a keys strategy to the orch channel", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "claude-ok");
    presence(directory, key, "claude");
    recordSpawned(key, { adapter: "claude", backend: "headless", handle: key });
    return expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/no pane input role/);
  }, 15_000);

  test("fails when claude keys fallback cannot deliver", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "claude-fail");
    presence(directory, key, "claude");
    recordSpawned(key, { adapter: "claude", backend: "headless", handle: key });

    expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/no pane input role/);
  }, 15_000);

  test("fails unsupported steer and setModel capabilities", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "unsupported");
    presence(directory, key, "claude");
    const caps: { steer: "inbox" | "keys" | "resume" | "none" } = claudeAdapter.capabilities;
    const previousSteer = caps.steer;
    caps.steer = "none";
    try {
      expect(deliverControl(key, { kind: "steer", text: "nope" })).rejects.toThrow(/steer.*none/);
    } finally {
      caps.steer = previousSteer;
    }
    expect(deliverControl(key, { kind: "model", model: "provider/new-model", id: "req-1" })).rejects.toThrow(/setModel false/);
  });

  test("requires presence for inbox delivery", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "missing-presence");
    recordSpawned(key, { adapter: "pi", backend: "headless", handle: key });

    expect(deliverControl(key, { kind: "steer", text: "lost" })).rejects.toThrow(/no presence dir/);
  });

  // A presence dir outlives the process that wrote it. Delivering into a dead
  // agent's inbox "succeeds", leaves the pane idle with no task, and surfaces
  // only as a generic RPC timeout — the daemon-bounce failure mode.
  test("refuses inbox delivery to an agent whose bridge never registered", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "no-bridge");
    fs.mkdirSync(path.join(directory, "agents", key), { recursive: true });
    recordSpawned(key, { adapter: "pi", backend: "headless", handle: key });

    expect(deliverControl(key, { kind: "steer", text: "lost" })).rejects.toThrow(/never registered/);
  });

  test("refuses inbox delivery to an agent whose process is gone", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "dead-bridge");
    seedStatus(directory, key, { agent: "pi", pid: DEAD_PID });
    recordSpawned(key, { adapter: "pi", backend: "headless", handle: key });

    const dispatched = deliverControl(key, { kind: "steer", text: "lost" });
    expect(dispatched).rejects.toThrow(/disconnected/);
    expect(dispatched).rejects.toThrow(/respawn required/);
    expect(fs.existsSync(path.join(directory, "agents", key, "inbox.jsonl"))).toBe(false);
  });
});
