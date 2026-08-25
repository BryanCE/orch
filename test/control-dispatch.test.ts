import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { deliverControl } from "../src/control/dispatch.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { recordSpawned } from "../src/presence/store.ts";
import { serializeIdentity } from "../src/backends/identity.ts";
import { getBackend } from "../src/backends/registry.ts";
import type { BackendId } from "../src/backends/backend.ts";
import { seedStatus } from "./helpers/presence.ts";

const headlessBackend = getBackend("headless")!;

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

  test("warns and succeeds when claude keys fallback delivers", async () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "claude-ok");
    presence(directory, key, "claude");
    // The keys fallback needs a pane to press keys into, and only the registry
    // records one — the identity id names the agent, never its backend handle.
    recordSpawned(key, { adapter: "claude", backend: "headless", handle: key });
    const deliver = headlessBackend.deliver.bind(headlessBackend);
    headlessBackend.deliver = () => true;
    const writes: string[] = [];
    const originalWrite = process.stderr.write.bind(process.stderr);
    process.stderr.write = (chunk: string | Uint8Array) => { writes.push(String(chunk)); return true; };
    try {
      await deliverControl(key, { kind: "steer", text: "hello claude" });
    } finally {
      process.stderr.write = originalWrite;
      headlessBackend.deliver = deliver;
    }
    expect(writes.join("")).toContain("degraded delivery");
  }, 15_000);

  test("fails when claude keys fallback cannot deliver", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "claude-fail");
    presence(directory, key, "claude");
    recordSpawned(key, { adapter: "claude", backend: "headless", handle: key });

    expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/cannot steer .*backend cannot deliver/);
  }, 15_000);

  test("fails unsupported steer and setModel capabilities", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "unsupported");
    presence(directory, key, "claude");
    const caps: { steer: "inbox" | "keys" | "resume" | "none" } = claudeAdapter.caps;
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
