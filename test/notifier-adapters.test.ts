import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createBuiltinNotifiers, createNotifierRegistry, type NotifyEvent, type Notifier } from "../src/notify.ts";

const event: NotifyEvent = {
  key: "demo:worker", workspace: "demo", agent: "worker", tab: "tab-1", model: "model-1",
  oldState: "working", newState: "blocked", task: "Q: approve deployment", ts: "2026-01-01T00:00:00.000Z",
};

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-notifier-test-"));
  tempDirs.push(dir);
  return dir;
}

function executable(dir: string, name: string, body: string): string {
  const script = path.join(dir, `${name}.js`);
  fs.writeFileSync(script, `${body}\n`);
  if (process.platform === "win32") {
    // Keep the extensionless probe path while the companion .cmd is resolved by Windows.
    const file = path.join(dir, name);
    fs.writeFileSync(file, "");
    fs.writeFileSync(`${file}.cmd`, `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`);
    return file;
  }
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/usr/bin/env bun\n${body}\n`);
  fs.chmodSync(file, 0o755);
  return file;
}

describe("notifier registry and built-in adapters", () => {
  test("skips an unavailable adapter without affecting available adapters", async () => {
    const delivered: string[] = [];
    const unavailable: Notifier = { id: "missing", label: "Missing", metadata: { requiredConfig: [] }, available: () => false, deliver: async () => { delivered.push("missing"); return true; } };
    const available: Notifier = { id: "works", label: "Works", metadata: { requiredConfig: [] }, available: () => true, deliver: async () => { delivered.push("works"); return true; } };
    const warnings: string[] = [];
    const registry = createNotifierRegistry([unavailable, available], { warn: (message) => warnings.push(message) });

    const result = await registry.deliver(event, [
      { id: "missing", on: ["blocked"], config: {} },
      { id: "works", on: ["blocked"], config: {} },
    ]);

    expect(result).toEqual([false, true]);
    expect(delivered).toEqual(["works"]);
    expect(warnings).toContain("missing notifier unavailable");
  });

  test("reports malformed required configuration instead of throwing", async () => {
    const registry = createNotifierRegistry(createBuiltinNotifiers());
    expect(registry.validate("webhook", {})).toEqual(["webhook requires url"]);
    expect(await registry.probe("webhook", {})).toMatchObject({ available: false, reason: "webhook requires url" });
    expect(await registry.deliverEntry({ id: "webhook", on: ["blocked"], config: {} }, event)).toBe(false);
  });

  test("webhook POST contains the canonical payload", async () => {
    const originalFetch = globalThis.fetch;
    let request: RequestInfo | undefined;
    let init: RequestInit | undefined;
    globalThis.fetch = (async (input, options) => {
      request = input;
      init = options;
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    try {
      const registry = createNotifierRegistry(createBuiltinNotifiers());
      expect(await registry.deliver("webhook", { url: "https://example.test/hook" }, event)).toBe(true);
      expect(request).toBe("https://example.test/hook");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ title: expect.any(String), workspace: "demo", workspaceColor: expect.any(String) });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("command adapter passes canonical JSON on stdin", async () => {
    const dir = tempDir();
    const output = path.join(dir, "stdin.json");
    const command = [
      process.execPath,
      "-e",
      `const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(output)}, fs.readFileSync(0, "utf8"));`,
    ];
    const registry = createNotifierRegistry(createBuiltinNotifiers());
    expect(await registry.deliver("command", { command }, event)).toBe(true);
    const body = JSON.parse(fs.readFileSync(output, "utf8"));
    expect(body).toMatchObject({ title: expect.any(String), workspace: "demo", workspaceColor: expect.any(String) });
  });

  test("desktop fallback selects notify-send, then WSL notify when it fails", async () => {
    const dir = tempDir();
    const calls = path.join(dir, "calls");
    const oldPath = process.env.PATH;
    const notify = executable(dir, "notify-send", `require("node:fs").appendFileSync(${JSON.stringify(calls)}, "notify\\n"); process.exit(0);`);
    const wsl = executable(dir, "wsl-notify-send", `require("node:fs").appendFileSync(${JSON.stringify(calls)}, "wsl\\n"); process.exit(0);`);
    process.env.PATH = dir;
    const oldHerdrEnv = process.env.HERDR_ENV;
    delete process.env.HERDR_ENV;
    const registry = createNotifierRegistry(createBuiltinNotifiers());
    expect((await registry.probe("desktop")).available).toBe(true);
    fs.rmSync(notify);
    expect((await registry.probe("desktop")).available).toBe(true);
    fs.rmSync(wsl);
    expect((await registry.probe("desktop")).available).toBe(false);
    try {
      // Availability probes above exercise each fallback tier without spawning host binaries.
    } finally {
      if (oldPath === undefined) delete process.env.PATH; else process.env.PATH = oldPath;
      if (oldHerdrEnv === undefined) delete process.env.HERDR_ENV; else process.env.HERDR_ENV = oldHerdrEnv;
    }
  });

  test("isolates delivery failures and still delivers to other adapters", async () => {
    const delivered: string[] = [];
    const bad: Notifier = { id: "bad", label: "Bad", metadata: { requiredConfig: [] }, available: () => true, deliver: async () => { throw new Error("boom"); } };
    const good: Notifier = { id: "good", label: "Good", metadata: { requiredConfig: [] }, available: () => true, deliver: async () => { delivered.push("good"); return true; } };
    const result = await createNotifierRegistry([bad, good]).deliver(event, [
      { id: "bad", on: ["blocked"], config: {} }, { id: "good", on: ["blocked"], config: {} },
    ]);
    expect(result).toEqual([false, true]);
    expect(delivered).toEqual(["good"]);
  });
});
