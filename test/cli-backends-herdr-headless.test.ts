import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseIdentity, tryParseIdentity } from "../src/backends/identity.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { allBackends, getBackend, resolveBackend } from "../src/backends/registry.ts";
import type { AgentAdapter } from "../src/adapters/adapter.ts";

const originalOrchDir = process.env.ORCH_DIR;

function restoreOrchDir(): void {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
}

afterEach(restoreOrchDir);

async function waitFor(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!check() && Date.now() < deadline) await Bun.sleep(20);
  expect(check()).toBe(true);
}

// A fake adapter whose headless command writes a presence status.json so the
// common path (spawn -> identity key -> presence dir) is exercised end-to-end
// without any real agent CLI.
const fakeAdapter = {
  id: "fake",
  headlessCmd(_prompt: string, opts: { key?: string; orchDir?: string }): string[] {
    const key = opts.key!;
    const directory = opts.orchDir!;
    const statusDir = path.join(directory, "agents", key);
    const statusFile = path.join(statusDir, "status.json");
    const script = [
      "const fs = require(\"node:fs\");",
      `fs.mkdirSync(${JSON.stringify(statusDir)}, { recursive: true });`,
      `fs.writeFileSync(${JSON.stringify(statusFile)}, JSON.stringify({ pid: process.pid, state: \"working\", key: ${JSON.stringify(key)} }));`,
      "setTimeout(() => {}, 5000);",
    ].join(" ");
    return [process.execPath, "-e", script];
  },
} as unknown as AgentAdapter;

describe("backend registry selection is backend-independent", () => {
  test("herdr, headless, and tmux are all registered", () => {
    const ids = allBackends().map((backend) => backend.id).sort();
    expect(ids).toEqual(["headless", "herdr", "tmux"]);
    expect(getBackend("headless")?.id).toBe("headless");
  });

  test("explicit headless selection resolves the headless backend", () => {
    const backend = resolveBackend({ explicit: "headless", configured: null });
    expect(backend.id).toBe("headless");
  });

  test("unknown explicit backend id throws with the supported list", () => {
    expect(() => resolveBackend({ explicit: "aider", configured: null })).toThrow(/Unknown backend/);
  });

  test("implicit selection follows the capability probe, never throwing", () => {
    // With no explicit/configured backend, resolution is probe-driven: herdr when
    // it is available AND inside a session, otherwise the headless fallback. This
    // must never fail closed regardless of the environment the suite runs in.
    const herdr = getBackend("herdr")!;
    const expected = herdr.isAvailable() && herdr.isInsideSession() ? "herdr" : "headless";
    expect(resolveBackend({ explicit: null, configured: null }).id).toBe(expected);
  });
});

describe("headless common path: identity key -> presence", () => {
  test("spawn mints a filesystem-safe headless identity and creates its presence dir", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-cli-headless-"));
    process.env.ORCH_DIR = dir;
    const backend = new HeadlessBackend();

    const handle = backend.spawn(fakeAdapter, { orchDir: dir, cwd: dir });

    // The presence key is a flat serialized identity, not a nested path.
    const identity = parseIdentity(handle.key);
    expect(identity.backend).toBe("headless");
    expect(identity.workspace).toBe("local");
    expect(identity.handle.length).toBeGreaterThan(0);
    expect(handle.key.includes("/")).toBe(false);

    // The agent writes its presence under ~/.orch/agents/<key>/.
    const statusFile = path.join(dir, "agents", handle.key, "status.json");
    await waitFor(() => fs.existsSync(statusFile));

    // mintIdentity round-trips the spawned key.
    expect(backend.mintIdentity(handle)).toEqual(identity);

    // spawned.jsonl records the backend, handle, adapter, and cwd.
    const registry = fs.readFileSync(path.join(dir, "spawned.jsonl"), "utf8").trim();
    const record = JSON.parse(registry) as { backend: string; adapter: string; cwd?: string };
    expect(record.backend).toBe("headless");
    expect(record.adapter).toBe("fake");
    expect(record.cwd).toBe(dir);

    try { process.kill(handle.pid, "SIGTERM"); } catch {}
  });

  test("workspaceOf reads the workspace from the structured key, not a regex", () => {
    expect(tryParseIdentity("headless~local~123-1")?.workspace).toBe("local");
    // A legacy ws:pane key no longer parses -> unscoped.
    expect(tryParseIdentity("wD:p1")).toBeNull();
  });
});
