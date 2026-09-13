import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { join } from "node:path";
import { cmdSpawn } from "../src/commands/spawn/index.ts";
import { parseSpawnFlags, resolveSpawnSettings } from "../src/commands/spawn/flags.ts";
import { workerPrompt } from "../src/worker-prompt.ts";
import { headlessBackend } from "../src/backends/headless/index.ts";
import { CommandRefusal } from "../src/refusal.ts";
import { errorMessage } from "../src/util.ts";
import { agentViews } from "../src/store/agent-view.ts";
import { orm } from "../src/store/connection.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";

const tempDirs: OrchDir[] = [];
const previousOrchDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);

afterEach(() => {
  while (tempDirs.length) removeTempDir(tempDirs.pop()!);
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
});
import { piAdapter } from "../src/adapters/pi.ts";
import { ompAdapter } from "../src/adapters/omp.ts";
import { sql } from "drizzle-orm";

import { numberField, row } from "./helpers/rows.ts";
import { testServices } from "./helpers/services.ts";
describe("commands/spawn", () => {
  test("refuses an invalid name before resolving or creating a workspace", async () => {
    const dir = tempOrchDir("orch-spawn-invalid-name-");
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
      await cmdSpawn(testServices({ orchDir: dir, settings: { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } } } }), ["Bad_Name", "ok-name", "--agent", "pi", "--backend", "headless", "--prompt", "work"]);
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
    const dir = tempOrchDir("orch-spawn-required-name-");
    tempDirs.push(dir);
    process.env.ORCH_DIR = dir;
    writeSettingsFixture(dir, {
      enabled: { adapters: ["pi"], backends: ["headless"] },
      defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } },
    });
    const before = agentViews(dir).map((view) => view.id);
    const beforeTasks = numberField(row(orm(dir), sql`SELECT COUNT(*) AS count FROM tasks`), "count");
    const backend = headlessBackend;
    const originalSpawn = backend.spawn.bind(backend);
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
      await cmdSpawn(testServices({ orchDir: dir, settings: { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } } } }), ["--agent", "pi", "--backend", "headless", "--prompt", "work", "--worktree"]);
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

  test("rejects removed spawn cap flag as unknown", () => {
    const removedFlag = "--spawn-" + "cap";
    const flags = parseSpawnFlags(["worker", removedFlag, "2"]);
    expect(flags.unknownFlags).toContain(removedFlag);
  });

  test("rejects --detached as an unknown spawn flag", async () => {
    const dir = tempOrchDir("orch-spawn-unknown-flag-");
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
      await cmdSpawn(testServices({ orchDir: dir, settings: { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } } } }), ["worker", "--detached", "--agent", "pi", "--backend", "headless", "--prompt", "work"]);
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

  // The positional arguments ARE the agent names, and how many you give is how
  // many panes you get. There is no --name flag to preserve.
  test("the positionals are the agent names", () => expect(parseSpawnFlags(["worker", "checker", "--agent", "claude", "--backend", "headless", "--json"])).toMatchObject({ positional: ["worker", "checker"], adapterFlag: "claude", backendFlag: "headless", json: true, unknownFlags: [] }));
  test("collects repeated prompts in agent order", () => expect(parseSpawnFlags(["a", "b", "c", "--prompt", "one", "--prompt", "two", "--prompt", "three"]).promptFlags).toEqual(["one", "two", "three"]));
  test("collects repeated files and models in order", () => expect(parseSpawnFlags(["a", "b", "--file", "one", "--file", "two", "--model", "m1", "--model", "m2"]).promptFiles).toEqual(["one", "two"]));
  test("collects repeated models in order", () => expect(parseSpawnFlags(["a", "b", "--model", "m1", "--model", "m2"]).modelFlags).toEqual(["m1", "m2"]));

  const settingsFor = (dir: OrchDir) => testServices({
    orchDir: dir,
    settings: { enabled: { adapters: ["pi"], backends: ["headless"] }, defaults: { adapter: "pi", backend: "headless", models: { pi: "openrouter/openai/gpt-5.6-luna" } } },
  }).settings.current();

  test("resolves one prompt file per agent", () => {
    const dir = tempOrchDir("orch-spawn-files-");
    tempDirs.push(dir);
    const taskDir = mkdtempSync(join(dir, "tasks-"));
    const files = ["first", "second", "third"].map((text, index) => {
      const file = join(taskDir, `${index}.txt`);
      writeFileSync(file, `  ${text}  `);
      return file;
    });
    const settings = resolveSpawnSettings(parseSpawnFlags(["a", "b", "c", "--file", files[0]!, "--file", files[1]!, "--file", files[2]!]), settingsFor(dir));
    expect(settings.agents.map((agent) => agent.prompt)).toEqual(["first", "second", "third"]);
  });

  test("reuses one prompt file for every agent", () => {
    const dir = tempOrchDir("orch-spawn-file-one-");
    tempDirs.push(dir);
    const file = join(mkdtempSync(join(dir, "tasks-")), "task.txt");
    writeFileSync(file, "  shared  ");
    const settings = resolveSpawnSettings(parseSpawnFlags(["a", "b", "c", "--file", file]), settingsFor(dir));
    expect(settings.agents.map((agent) => agent.prompt)).toEqual(["shared", "shared", "shared"]);
  });

  test("refuses an incorrect number of prompt files", () => {
    const dir = tempOrchDir("orch-spawn-file-count-");
    tempDirs.push(dir);
    expect(() => resolveSpawnSettings(parseSpawnFlags(["a", "b", "c", "--file", "one", "--file", "two"]), settingsFor(dir))).toThrow(/accepts one value for all agents or exactly 3 values/);
  });

  test("refuses stdin prompt files more than once", () => {
    const dir = tempOrchDir("orch-spawn-file-stdin-");
    tempDirs.push(dir);
    expect(() => resolveSpawnSettings(parseSpawnFlags(["a", "b", "--file", "-", "--file", "-"]), settingsFor(dir))).toThrow(/--file - reads stdin once; name it at most once/);
  });

  test("resolves one model per agent", () => {
    const dir = tempOrchDir("orch-spawn-models-");
    tempDirs.push(dir);
    const settings = resolveSpawnSettings(parseSpawnFlags(["a", "b", "--model", "openrouter/openai/gpt-5.6-luna", "--model", "openrouter/anthropic/claude-sonnet-4.5"]), settingsFor(dir));
    expect(settings.agents[0]?.model).not.toBe(settings.agents[1]?.model);
  });

  test("refuses an incorrect number of models", () => {
    const dir = tempOrchDir("orch-spawn-model-count-");
    tempDirs.push(dir);
    expect(() => resolveSpawnSettings(parseSpawnFlags(["a", "b", "--model", "m1", "--model", "m2", "--model", "m3"]), settingsFor(dir))).toThrow(/accepts one value for all agents or exactly 2 values/);
  });
  test("each pi flavor launches its own binary and preserves raw prompt", () => {
    expect(piAdapter.interactiveCmd({})).toBe("pi");
    expect(piAdapter.headlessCmd("go", {})[0]).toBe("pif");
    expect(ompAdapter.interactiveCmd({})).toBe("omp");
    expect(ompAdapter.headlessCmd("go", {})[0]).toBe("omp");
    expect(workerPrompt("hello", true, undefined)).toBe("hello");
  });
});
