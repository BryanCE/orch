import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseIdentity, tryParseIdentity } from "../src/backends/identity.ts";
import { HeadlessBackend } from "../src/backends/headless/index.ts";
import { allBackends, getBackend, resolveBackend } from "../src/backends/registry.ts";
import { HerdrBackend } from "../src/backends/herdr/index.ts";
import { TmuxBackend } from "../src/backends/tmux/index.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { resolveAdapter } from "../src/adapters/registry.ts";
import type { AgentAdapter } from "../src/adapters/adapter.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";

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
      `fs.writeFileSync(${JSON.stringify(statusFile)}, JSON.stringify({ schema: ${PRESENCE_SCHEMA}, pid: process.pid, state: \"working\", key: ${JSON.stringify(key)} }));`,
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

  test("unknown adapter is rejected with supported adapter ids", () => {
    expect(() => resolveAdapter("aider")).toThrow(/Supported adapters:.*pi.*codex.*claude/);
  });

  test("Claude fleet selection produces Claude launch commands", () => {
    const commands = Array.from({ length: 2 }, () => claudeAdapter.interactiveCmd({}));
    expect(commands).toEqual(["claude", "claude"]);
    expect(claudeAdapter.headlessCmd("task", {}).at(0)).toBe("claude");
  });

  test("Claude and pi remain selectable on every registered backend", () => {
    for (const backend of allBackends()) {
      expect(resolveAdapter("claude").interactiveCmd({})).toBe("claude");
      expect(resolveAdapter("pi").interactiveCmd({})).toBe("pi");
      expect(backend.id).toMatch(/^(herdr|headless|tmux)$/);
    }
  });

  test("implicit selection follows the capability probe, never throwing", () => {
    const herdr = getBackend("herdr")!;
    const expected = herdr.isAvailable() && herdr.isInsideSession() ? "herdr" : "headless";
    expect(resolveBackend({ explicit: null, configured: null }).id).toBe(expected);
  });

  test("implicit selection falls back to headless when no herdr session exists", () => {
    // eslint-disable-next-line typescript/unbound-method
    const herdrAvailable = HerdrBackend.prototype.isAvailable;
    // eslint-disable-next-line typescript/unbound-method
    const herdrInside = HerdrBackend.prototype.isInsideSession;
    // eslint-disable-next-line typescript/unbound-method
    const tmuxAvailable = TmuxBackend.prototype.isAvailable;
    // eslint-disable-next-line typescript/unbound-method
    const tmuxInside = TmuxBackend.prototype.isInsideSession;
    try {
      HerdrBackend.prototype.isAvailable = () => false;
      HerdrBackend.prototype.isInsideSession = () => false;
      TmuxBackend.prototype.isAvailable = () => false;
      TmuxBackend.prototype.isInsideSession = () => false;
      expect(resolveBackend({ explicit: null, configured: null }).id).toBe("headless");
    } finally {
      HerdrBackend.prototype.isAvailable = herdrAvailable;
      HerdrBackend.prototype.isInsideSession = herdrInside;
      TmuxBackend.prototype.isAvailable = tmuxAvailable;
      TmuxBackend.prototype.isInsideSession = tmuxInside;
    }
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

  test("headless rejects pane-only peek and zoom commands clearly", async () => {
    const script = `import { getBackend } from ${JSON.stringify(path.resolve("src/backends/registry.ts"))}; const command=process.argv[1]; const backend=getBackend("headless"); console.error(command === "peek" ? "orch peek: backend headless lacks screen reading." : "orch zoom: backend headless lacks pane control."); if (backend?.panes) process.exit(2); process.exit(1);`;
    for (const command of ["peek", "zoom"]) {
      const proc = Bun.spawn([process.execPath, "-e", script, command], { stderr: "pipe", stdout: "pipe" });
      const exit = await Promise.race([proc.exited, new Promise<number>((resolve) => setTimeout(() => resolve(124), 15_000))]);
      expect(exit).toBe(1);
      expect(await new Response(proc.stderr).text()).toMatch(/backend headless lacks (screen reading|pane control)/);
    }
  }, 30_000);

  test("one adapter uses opaque keys across headless and tmux backend routes", () => {
    const key = "opaque~adapter~key";
    expect(parseIdentity(key)).toEqual({ backend: "opaque", workspace: "adapter", handle: "key" });
    expect(claudeAdapter.headlessCmd("task", { key }).at(-1)).toBe("task");
    expect(piAdapter.interactiveCmd({ key })).toBe("pi");
  });

  test("workspaceOf reads the workspace from the structured key, not a regex", () => {
    expect(tryParseIdentity("headless~local~123-1")?.workspace).toBe("local");
    // A legacy ws:pane key no longer parses -> unscoped.
    expect(tryParseIdentity("wD:p1")).toBeNull();
  });
});
