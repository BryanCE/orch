import { describe, expect, test } from "bun:test";
import { allAdapters } from "../src/adapters/registry.ts";
import { planShimInstall } from "../src/commands/setup.ts";
import { fakeAdapter } from "./helpers/adapter.ts";

describe("adapter role composition", () => {
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
    }]));
    expect(roles.get("pi")).toEqual({ thinking: true, workerLaunch: true, modelControl: true, lifecycleControl: true, sessionView: true, workspaceTrust: true, shim: true, defaultModel: true, models: true, modelWarm: true });
    expect(roles.get("omp")).toEqual({ thinking: false, workerLaunch: true, modelControl: true, lifecycleControl: true, sessionView: true, workspaceTrust: false, shim: true, defaultModel: true, models: true, modelWarm: true });
    expect(roles.get("claude")).toEqual({ thinking: false, workerLaunch: false, modelControl: false, lifecycleControl: false, sessionView: true, workspaceTrust: false, shim: true, defaultModel: false, models: true, modelWarm: false });
    expect(roles.get("codex")).toEqual({ thinking: false, workerLaunch: false, modelControl: false, lifecycleControl: false, sessionView: true, workspaceTrust: false, shim: true, defaultModel: false, models: true, modelWarm: false });
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
