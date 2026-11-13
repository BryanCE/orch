import { describe, expect, test } from "bun:test";
import { allAdapters } from "../src/adapters/registry.ts";
import { planShimInstall } from "../src/daemon/server/setup.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { ompAdapter } from "../src/adapters/omp.ts";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { codexAdapter } from "../src/adapters/codex.ts";
import { opencodeAdapter } from "../src/adapters/opencode.ts";

describe("adapter role composition", () => {
  test.each([
    { adapter: piAdapter, flag: "--session" },
    { adapter: ompAdapter, flag: "--resume" },
    { adapter: claudeAdapter, flag: "--resume" },
    { adapter: codexAdapter, flag: "resume" },
    { adapter: opencodeAdapter, flag: "--session" },
  ])("$adapter.id resumes a terminal conversation by id", ({ adapter, flag }) => {
    const opts = { model: "test-model" };
    const sessionId = "conversation-id";
    expect(adapter.resume.argv(opts, sessionId)).toEqual([...adapter.interactiveArgv(opts), flag, sessionId]);
  });

  test("fake adapters have no resume role by default", () => {
    expect(fakeAdapter().resume).toBeNull();
  });

  test("composes complete roles per adapter", () => {
    const roles = new Map(allAdapters().map((adapter) => [adapter.id, {
      thinking: adapter.thinking !== null,
      workerLaunch: adapter.workerLaunch !== null,
      modelControl: adapter.modelControl !== null,
      lifecycleControl: adapter.lifecycleControl !== null,
      sessionView: adapter.sessionView !== null,
      workspaceTrust: adapter.workspaceTrust !== null,
      shim: adapter.shim !== null,
      defaultModel: adapter.defaultModel !== null,
      models: adapter.models !== null,
      modelWarm: adapter.modelWarm !== null,
      compaction: adapter.compaction !== null,
    }]));
    expect(roles.get("pi")).toEqual({ thinking: true, workerLaunch: true, modelControl: true, lifecycleControl: true, sessionView: true, workspaceTrust: true, shim: true, defaultModel: true, models: true, modelWarm: true, compaction: true });
    expect(roles.get("omp")).toEqual({ thinking: false, workerLaunch: true, modelControl: true, lifecycleControl: true, sessionView: true, workspaceTrust: false, shim: true, defaultModel: true, models: true, modelWarm: true, compaction: false });
    expect(roles.get("claude")).toEqual({ thinking: true, workerLaunch: false, modelControl: false, lifecycleControl: true, sessionView: true, workspaceTrust: false, shim: true, defaultModel: false, models: true, modelWarm: true, compaction: true });
    expect(roles.get("opencode")).toEqual({ thinking: false, workerLaunch: false, modelControl: false, lifecycleControl: false, sessionView: false, workspaceTrust: false, shim: false, defaultModel: false, models: true, modelWarm: true, compaction: false });
    expect(roles.get("codex")).toEqual({ thinking: false, workerLaunch: false, modelControl: false, lifecycleControl: false, sessionView: true, workspaceTrust: false, shim: true, defaultModel: false, models: true, modelWarm: false, compaction: true });
  });

  test("answers with zero exit code when a shim role is absent", () => {
    expect(planShimInstall(fakeAdapter())).toEqual({
      outcome: "answer",
      reason: "no-environment-role",
      exitCode: 0,
      text: "pi: no environment integration role - agents will lack presence reporting",
    });
  });
});
