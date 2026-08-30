import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { createModelControl, resolveRegistryModel } from "../src/agent/model-control.ts";
import { splitThinkingSuffix } from "../src/policy/thinking.ts";
import type { HarnessApi, HarnessContext, ResolvedModel } from "../src/types/agent.ts";
import { isRecord } from "../src/util.ts";

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-model-control-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

// A registry model is opaque to model-control — it only forwards whatever find()
// returns into pi.setModel. A tagged sentinel is enough to assert identity.
function fakeModel(provider: string, id: string): ResolvedModel {
  return { provider, id };
}

const noRetry = { attempts: 1, delayMs: 0, backoff: 1 };

/** The outcome record applyControlCommand writes to control.json. */
interface ControlOutcome {
  id?: unknown;
  success: boolean;
  requested?: unknown;
  error?: string;
}

function readControlOutcome(file: string): ControlOutcome {
  const value: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!isRecord(value) || typeof value.success !== "boolean") throw new Error("invalid control outcome");
  if (value.error !== undefined && typeof value.error !== "string") throw new Error("invalid control outcome error");
  return { id: value.id, success: value.success, requested: value.requested, error: value.error };
}

function modelContext(find: (provider: string, id: string) => ResolvedModel | undefined): HarnessContext {
  return {
    hasUI: false,
    sessionManager: {
      getSessionFile: () => undefined,
      getSessionId: () => undefined,
      getBranch: () => [],
    },
    modelRegistry: { find },
    ui: {
      notify: () => undefined,
      setStatus: () => undefined,
      setWidget: () => undefined,
    },
    isIdle: () => true,
    getContextUsage: () => undefined,
  };
}

describe("splitThinkingSuffix", () => {
  test("splits a valid ladder effort off the bare id", () => {
    expect(splitThinkingSuffix("openai-codex/gpt-5.6-luna:medium")).toEqual({
      bare: "openai-codex/gpt-5.6-luna",
      thinking: "medium",
    });
  });

  test("leaves a bare model untouched", () => {
    expect(splitThinkingSuffix("openai-codex/gpt-5.6-luna")).toEqual({
      bare: "openai-codex/gpt-5.6-luna",
    });
  });

  test("keeps a trailing colon token that is not a thinking level as part of the id", () => {
    expect(splitThinkingSuffix("provider/ns:model")).toEqual({ bare: "provider/ns:model" });
  });
});

describe("resolveRegistryModel — task 12.7 suffixed lookup", () => {
  test("looks up the BARE id and returns the effort suffix separately", async () => {
    const seen: { provider: string; id: string }[] = [];
    const find = (provider: string, id: string): ResolvedModel | undefined => {
      seen.push({ provider, id });
      // The registry keys on the bare id, exactly as `pi --list-models` prints it.
      return id === "gpt-5.6-luna" ? fakeModel(provider, id) : undefined;
    };
    const { model, thinking } = await resolveRegistryModel(
      "openai-codex/gpt-5.6-luna:medium",
      find,
      noRetry,
    );
    expect(seen).toEqual([{ provider: "openai-codex", id: "gpt-5.6-luna" }]);
    expect(model).toEqual(fakeModel("openai-codex", "gpt-5.6-luna"));
    expect(thinking).toBe("medium");
  });

  test("retries until a still-booting registry answers", async () => {
    let calls = 0;
    const find = (provider: string, id: string): ResolvedModel | undefined => {
      calls += 1;
      return calls >= 3 ? fakeModel(provider, id) : undefined;
    };
    const { model } = await resolveRegistryModel(
      "openai-codex/gpt-5.6-luna",
      find,
      { attempts: 8, delayMs: 0, backoff: 1 },
    );
    expect(calls).toBe(3);
    expect(model).toEqual(fakeModel("openai-codex", "gpt-5.6-luna"));
  });

  test("throws when the registry never yields the model", () => {
    expect(
      resolveRegistryModel("openai-codex/gpt-5.6-luna:high", () => undefined, noRetry),
    ).rejects.toThrow(/Model not in registry.*openai-codex\/gpt-5.6-luna$/);
  });

  test("rejects a token without a provider/id shape", () => {
    expect(
      resolveRegistryModel("gpt-5.6-luna", () => undefined, noRetry),
    ).rejects.toThrow(/provider\/id string/);
  });
});

describe("createModelControl.applyControlCommand", () => {
  function makePi(): { pi: HarnessApi; calls: { model?: ResolvedModel; thinking?: string } } {
    const calls: { model?: ResolvedModel; thinking?: string } = {};
    const pi: HarnessApi = {
      on: () => undefined,
      registerTool: () => undefined,
      registerCommand: () => undefined,
      sendUserMessage: () => undefined,
      setModel: (model) => {
        calls.model = model;
        return Promise.resolve(true);
      },
      getThinkingLevel: () => undefined,
      setThinkingLevel: (level) => {
        calls.thinking = level;
      },
      events: { on: () => undefined },
    };
    return { pi, calls };
  }

  test("applies a suffixed model command and records a success outcome", async () => {
    const dir = tempDir();
    const controlFile = path.join(dir, "control.json");
    const { pi, calls } = makePi();
    let refreshed = 0;
    const control = createModelControl({
      harness: pi,
      context: () => modelContext((p, id) => fakeModel(p, id)),
      controlFile: () => controlFile,
      refreshPresence: () => {
        refreshed += 1;
      },
    });

    await control.applyControlCommand({ cmd: "model", model: "openai-codex/gpt-5.6-luna:medium", id: "req-1" });

    expect(calls.model).toEqual(fakeModel("openai-codex", "gpt-5.6-luna"));
    expect(calls.thinking).toBe("medium");
    expect(refreshed).toBe(1);
    const outcome = readControlOutcome(controlFile);
    expect(outcome.success).toBe(true);
    expect(outcome.requested).toEqual({ model: "openai-codex/gpt-5.6-luna:medium" });
    // The dispatcher matches the outcome to its own request by this id.
    expect(outcome.id).toBe("req-1");
  });

  test("records a failure outcome when the model is rejected", async () => {
    const dir = tempDir();
    const controlFile = path.join(dir, "control.json");
    const { pi, calls } = makePi();
    const control = createModelControl({
      harness: pi,
      context: () => modelContext(() => undefined),
      controlFile: () => controlFile,
      refreshPresence: () => undefined,
    });

    await control.applyControlCommand({ cmd: "model", model: "openrouter/bad/model" });

    expect(calls.model).toBeUndefined();
    const outcome = readControlOutcome(controlFile);
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/Model not in registry/);
  });

  test("applies a thinking command directly", async () => {
    const dir = tempDir();
    const controlFile = path.join(dir, "control.json");
    const { pi, calls } = makePi();
    const control = createModelControl({
      harness: pi,
      context: () => undefined,
      controlFile: () => controlFile,
      refreshPresence: () => undefined,
    });

    await control.applyControlCommand({ cmd: "thinking", level: "high" });

    expect(calls.thinking).toBe("high");
    const outcome = readControlOutcome(controlFile);
    expect(outcome.success).toBe(true);
    expect(outcome.requested).toEqual({ thinking: "high" });
  });
});
