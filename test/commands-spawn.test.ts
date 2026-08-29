import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdSpawn, parseSpawnFlags, workerPrompt } from "../src/commands/spawn.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { openStore } from "../src/store/connection.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const tempDirs: string[] = [];
const previousOrchDir = process.env.ORCH_DIR;

afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
});
import { piAdapter } from "../src/adapters/pi.ts";
import { ompAdapter } from "../src/adapters/omp.ts";

describe("commands/spawn", () => {
  test("refuses an invalid name before resolving or creating a workspace", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-invalid-name-"));
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
    });
    const originalExit = process.exit.bind(process);
    const originalWrite = process.stderr.write.bind(process.stderr);
    let stderr = "";
    process.stderr.write = (chunk: string | Uint8Array) => { stderr += String(chunk); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["2", "--name", "Bad_Name", "--agent", "pi", "--backend", "headless", "--prompt", "work"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stderr.write = originalWrite;
    }
    expect(refusal).toBeInstanceOf(Error);
    expect(stderr).toMatch(/invalid agent name.*must match/i);
    expect([...spawnedRecords().entries()]).toEqual([]);
  });

  test("refuses spawn without a name before any spawn mutations", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-required-name-"));
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
    });
    const before = [...spawnedRecords().entries()];
    const beforeTasks = (openStore(dir).query("SELECT COUNT(*) AS count FROM tasks").get() as { count: number }).count;
    const backend = headlessBackend as unknown as { spawn: typeof headlessBackend.spawn };
    const originalSpawn = backend.spawn;
    let backendAllocations = 0;
    backend.spawn = (...args: Parameters<typeof backend.spawn>): ReturnType<typeof backend.spawn> => {
      backendAllocations++;
      return originalSpawn(...args);
    };
    const originalExit = process.exit.bind(process);
    const originalWrite = process.stderr.write.bind(process.stderr);
    let stderr = "";
    process.stderr.write = (chunk: string | Uint8Array) => { stderr += String(chunk); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["1", "--agent", "pi", "--backend", "headless", "--prompt", "work", "--worktree"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stderr.write = originalWrite;
      backend.spawn = originalSpawn;
    }
    expect(refusal).toBeInstanceOf(Error);
    expect(stderr).toMatch(/name.*required/i);
    expect(backendAllocations).toBe(0);
    expect([...spawnedRecords().entries()]).toEqual(before);
    expect((openStore(dir).query("SELECT COUNT(*) AS count FROM tasks").get() as { count: number }).count).toBe(beforeTasks);
    expect(existsSync(join(dir, ".orch-worktrees"))).toBe(false);
  });

  test("rejects --detached as an unknown spawn flag", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-unknown-flag-"));
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
    });
    const originalExit = process.exit.bind(process);
    const originalWrite = process.stderr.write.bind(process.stderr);
    let stderr = "";
    process.stderr.write = (chunk: string | Uint8Array) => { stderr += String(chunk); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["1", "--name", "worker", "--detached", "--agent", "pi", "--backend", "headless", "--prompt", "work"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stderr.write = originalWrite;
    }
    expect(refusal).toBeInstanceOf(Error);
    expect(stderr).toMatch(/unknown flag.*--detached/i);
    expect([...spawnedRecords().entries()]).toEqual([]);
  });

  test("preserves the existing named-spawn path", () => expect(parseSpawnFlags(["2", "--name", "worker", "--agent", "claude", "--backend", "headless", "--json"])).toMatchObject({ positional: ["2"], names: ["worker"], adapterFlag: "claude", backendFlag: "headless", json: true, unknownFlags: [] }));
  test("collects repeated prompts in agent order", () => expect(parseSpawnFlags(["3", "--prompt", "one", "--prompt", "two", "--prompt", "three"]).promptFlags).toEqual(["one", "two", "three"]));
  test("each pi flavor launches its own binary and preserves raw prompt", () => {
    expect(piAdapter.interactiveCmd({})).toBe("pi");
    expect(piAdapter.headlessCmd("go", {})[0]).toBe("pif");
    expect(ompAdapter.interactiveCmd({})).toBe("omp");
    expect(ompAdapter.headlessCmd("go", {})[0]).toBe("omp");
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
  });
});
