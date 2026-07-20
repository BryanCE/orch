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
import { seedStatus } from "./helpers/presence.ts";

const headlessBackend = getBackend("headless")!;

const originalOrchDir = process.env.ORCH_DIR;
const originalPath = process.env.PATH;
const tempDirs: string[] = [];

function tempDir(prefix = "orch-control-dispatch-"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function target(backend: "headless" | "tmux", handle: string): string {
  return serializeIdentity({ backend, workspace: backend === "headless" ? "local" : "test", handle });
}

function presence(directory: string, key: string, agent: string): string {
  seedStatus(directory, key, { agent, pid: process.pid });
  return path.join(directory, "agents", key);
}

function executable(directory: string, name: string, body: string): void {
  const file = path.join(directory, name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`);
  fs.chmodSync(file, 0o755);
  process.env.PATH = `${directory}${path.delimiter}${originalPath ?? ""}`;
}

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  process.env.PATH = originalPath;
  delete process.env.CODEX_TEST_EXIT;
  delete process.env.TMUX_DELIVER_EXIT;
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

    expect(deliverControl(key, { kind: "steer", text: "hello claude" })).rejects.toThrow(/cannot steer .*backend cannot deliver/);
  }, 15_000);

  // These two exercise POSIX exec of a chmod'd shell-script stub on PATH. orch's
  // runtime is POSIX (it shells out to sleep/pgrep/bash), and native-Windows bun
  // cannot run an extensionless #!/bin/sh stub, so they only run off win32.
  const posixExec = test.skipIf(process.platform === "win32");

  posixExec("executes codex steer command and accepts exit zero", async () => {
    const directory = tempDir();
    const bin = tempDir("orch-control-bin-");
    process.env.ORCH_DIR = directory;
    executable(bin, "codex", "exit \"${CODEX_TEST_EXIT:-0}\"");
    const key = target("headless", "codex-ok");
    presence(directory, key, "codex");

    await deliverControl(key, { kind: "steer", text: "resume me" });
  }, 15_000);

  posixExec("treats a nonzero codex command exit as failure", () => {
    const directory = tempDir();
    const bin = tempDir("orch-control-bin-");
    process.env.ORCH_DIR = directory;
    process.env.CODEX_TEST_EXIT = "7";
    executable(bin, "codex", "exit \"${CODEX_TEST_EXIT:-0}\"");
    const key = target("headless", "codex-fail");
    presence(directory, key, "codex");

    expect(deliverControl(key, { kind: "steer", text: "resume me" })).rejects.toThrow(/codex failed/);
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
    expect(deliverControl(key, { kind: "model", model: "new-model" })).rejects.toThrow(/setModel false/);
  });

  test("requires presence for inbox delivery", () => {
    const directory = tempDir();
    process.env.ORCH_DIR = directory;
    const key = target("headless", "missing-presence");
    recordSpawned(key, { adapter: "pi", backend: "headless", handle: key });

    expect(deliverControl(key, { kind: "steer", text: "lost" })).rejects.toThrow(/no presence dir/);
  });
});
