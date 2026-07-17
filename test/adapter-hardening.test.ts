import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, test } from "bun:test";
import { PiAdapter } from "../src/adapters/pi.ts";
import { CodexAdapter } from "../src/adapters/codex.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { loadConfig } from "../src/config.ts";
import { checkNotifiers, checkExtensionStaleness } from "../src/doctor.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { parseIdentity } from "../src/backends/identity.ts";
import type { AgentAdapter } from "../src/adapters/adapter.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const temp = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "orch-hardening-"));

describe("adapter and runtime hardening", () => {
  test("malformed or empty adapter output never throws and yields no result", () => {
    const pi = new PiAdapter();
    const codex = new CodexAdapter();
    expect(() => pi.extractResult({ key: "missing", sessionPath: "/missing/session.jsonl" })).not.toThrow();
    expect(pi.extractResult({ key: "missing", sessionPath: "/missing/session.jsonl" })).toBeUndefined();
    expect(codex.extractResult({ output: "{broken\n" })).toBeUndefined();
    expect(claudeAdapter.extractResult({ key: "missing", output: "   " })).toBeUndefined();
  });

  test("rejects unknown config keys with a useful path", () => {
    const directory = temp();
    writeSettingsFixture(directory, { defaults: { modle: "typo" } });
    expect(() => loadConfig(directory)).toThrow(/modle/);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test("doctor returns failures for malformed notifier config and broken agent directories", async () => {
    const directory = temp();
    writeSettingsFixture(directory, { queue: { max_retries: "never" } });
    expect(await checkNotifiers(directory)).toMatchObject({ status: "fail", id: "notifiers" });
    const agents = path.join(directory, "agents");
    fs.writeFileSync(agents, "not a directory");
    expect(await checkExtensionStaleness(directory, path.join(directory, "missing.js"))).toMatchObject({ status: "fail", id: "extension-staleness" });
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test("headless generates one safe presence key when no key is supplied", () => {
    const directory = temp();
    const adapter: AgentAdapter = {
      id: "pi",
      caps: { steer: "none", ask: false, setModel: false, sessionTail: false, lifecycle: [], enforcesCommandLocks: false },
      interactiveCmd: () => "true",
      headlessCmd: () => [process.execPath, "-e", "setTimeout(() => {}, 1000)"],
      detectState: () => "unknown",
      steer: () => undefined,
      answer: () => undefined,
      extractResult: () => undefined,
    };
    const backend = new HeadlessBackend({ pidAlive: () => false });
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = directory;
    const handle = backend.spawn(adapter, {});
    const identity = parseIdentity(handle.key);
    expect(identity.backend).toBe("headless");
    expect(identity.workspace).toBe("local");
    expect(identity.handle.length).toBeGreaterThan(0);
    expect(handle.key).not.toContain("/");
    expect(backend.list()).toContainEqual({ ...handle, alive: false });
    try { process.kill(handle.pid, "SIGKILL"); } catch { /* already exited */ }
    if (previous === undefined) delete process.env.ORCH_DIR;
    else process.env.ORCH_DIR = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
