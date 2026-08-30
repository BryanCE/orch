import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdSpawn, parseSpawnFlags } from "../src/commands/spawn.ts";
import { workerPrompt } from "../src/worker-prompt.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { errorMessage } from "../src/util.ts";
import { agentViews } from "../src/store/agent-view.ts";
import { orm } from "../src/store/connection.ts";
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
import { sql } from "drizzle-orm";

import { numberField, row } from "./helpers/rows.ts";
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
    const originalWrite = process.stdout.write.bind(process.stdout);
    let stdout = "";
    process.stdout.write = (chunk: string | Uint8Array) => { stdout += String(chunk); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["Bad_Name", "ok-name", "--agent", "pi", "--backend", "headless", "--prompt", "work"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stdout.write = originalWrite;
    }
    expect(refusal).toBeInstanceOf(CommandRefusal);
    expect(errorMessage(refusal)).toMatch(/invalid agent name.*must match/i);
    // A refusal mints nothing: no identity, so no agent to compose (A1).
    expect(agentViews(dir)).toEqual([]);
  });

  test("refuses spawn without a name before any spawn mutations", async () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-spawn-required-name-"));
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
    });
    const before = agentViews(dir).map((view) => view.id);
    const beforeTasks = numberField(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`), "count");
    const backend = headlessBackend;
    const originalSpawn = backend.spawn;
    let backendAllocations = 0;
    backend.spawn = (...args: Parameters<typeof backend.spawn>): ReturnType<typeof backend.spawn> => {
      backendAllocations++;
      return originalSpawn(...args);
    };
    const originalExit = process.exit.bind(process);
    const originalWrite = process.stdout.write.bind(process.stdout);
    let stdout = "";
    process.stdout.write = (chunk: string | Uint8Array) => { stdout += String(chunk); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["--agent", "pi", "--backend", "headless", "--prompt", "work", "--worktree"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stdout.write = originalWrite;
      backend.spawn = originalSpawn;
    }
    expect(refusal).toBeInstanceOf(CommandRefusal);
    expect(errorMessage(refusal)).toMatch(/must be named at creation/i);
    expect(backendAllocations).toBe(0);
    expect(agentViews(dir).map((view) => view.id)).toEqual(before);
    expect(numberField(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`), "count")).toBe(beforeTasks);
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
    const originalWrite = process.stdout.write.bind(process.stdout);
    let stdout = "";
    process.stdout.write = (chunk: string | Uint8Array) => { stdout += String(chunk); return true; };
    process.exit = (code?: number): never => { throw new Error(`exit ${code ?? 0}`); };
    let refusal: unknown;
    try {
      await cmdSpawn(["1", "--name", "worker", "--detached", "--agent", "pi", "--backend", "headless", "--prompt", "work"]);
    } catch (error: unknown) {
      refusal = error;
    } finally {
      process.exit = originalExit;
      process.stdout.write = originalWrite;
    }
    expect(refusal).toBeInstanceOf(CommandRefusal);
    expect(errorMessage(refusal)).toMatch(/unknown flag.*--detached/i);
    // A refusal mints nothing: no identity, so no agent to compose (A1).
    expect(agentViews(dir)).toEqual([]);
  });

  // TASKS/02-scope.md F4: the positional arguments ARE the agent names, and how
  // many you give is how many panes you get. There is no --name flag to preserve.
  test("the positionals are the agent names", () => expect(parseSpawnFlags(["worker", "checker", "--agent", "claude", "--backend", "headless", "--json"])).toMatchObject({ positional: ["worker", "checker"], adapterFlag: "claude", backendFlag: "headless", json: true, unknownFlags: [] }));
  test("collects repeated prompts in agent order", () => expect(parseSpawnFlags(["a", "b", "c", "--prompt", "one", "--prompt", "two", "--prompt", "three"]).promptFlags).toEqual(["one", "two", "three"]));
  test("each pi flavor launches its own binary and preserves raw prompt", () => {
    expect(piAdapter.interactiveCmd({})).toBe("pi");
    expect(piAdapter.headlessCmd("go", {})[0]).toBe("pif");
    expect(ompAdapter.interactiveCmd({})).toBe("omp");
    expect(ompAdapter.headlessCmd("go", {})[0]).toBe("omp");
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
  });
});
