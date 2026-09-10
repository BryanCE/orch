import { describe, expect, test } from "bun:test";
import { createModelControl, resolveRegistryModel } from "../src/agent/model-control.ts";
import { splitThinkingSuffix } from "../src/policy/thinking.ts";
import type { ControlOutcome, HarnessApi, HarnessContext, ResolvedModel } from "../src/types/agent.ts";
import type { JsonRecord } from "../src/types/core.ts";

// A registry model is opaque to model-control — it only forwards whatever find()
// returns into pi.setModel. A tagged sentinel is enough to assert identity.
function fakeModel(provider: string, id: string): ResolvedModel {
  return { provider, id };
}

const noRetry = { attempts: 1, delayMs: 0, backoff: 1 };

/** Captures what applyControlCommand appends to history and reports to orchd. */
function outcomeRecorder() {
  const recorded: JsonRecord[] = [];
  const reported: ControlOutcome[] = [];
  return {
    recorded,
    reported,
    record: (outcome: JsonRecord): void => {
      recorded.push(outcome);
    },
    report: (outcome: ControlOutcome): Promise<boolean> => {
      reported.push(outcome);
      return Promise.resolve(true);
    },
  };
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
    const { pi, calls } = makePi();
    const outcomes = outcomeRecorder();
    let refreshed = 0;
    const control = createModelControl({
      harness: pi,
      context: () => modelContext((p, id) => fakeModel(p, id)),
      recordOutcome: outcomes.record,
      reportOutcome: outcomes.report,
      refreshPresence: () => {
        refreshed += 1;
      },
    });

    await control.applyControlCommand({ cmd: "model", model: "openai-codex/gpt-5.6-luna:medium", id: "req-1" });

    expect(calls.model).toEqual(fakeModel("openai-codex", "gpt-5.6-luna"));
    expect(calls.thinking).toBe("medium");
    expect(refreshed).toBe(1);
    expect(outcomes.recorded[0]).toMatchObject({ id: "req-1", success: true, requested: { model: "openai-codex/gpt-5.6-luna:medium" } });
    // The dispatcher matches the report to its own request by this id.
    expect(outcomes.reported[0]).toMatchObject({ id: "req-1", command: "model", requested: { model: "openai-codex/gpt-5.6-luna:medium" } });
    expect(outcomes.reported[0]?.error).toBeUndefined();
  });

  test("records a failure outcome when the model is rejected", async () => {
    const { pi, calls } = makePi();
    const outcomes = outcomeRecorder();
    const control = createModelControl({
      harness: pi,
      context: () => modelContext(() => undefined),
      recordOutcome: outcomes.record,
      reportOutcome: outcomes.report,
      refreshPresence: () => undefined,
    });

    await control.applyControlCommand({ cmd: "model", model: "openrouter/bad/model" });

    expect(calls.model).toBeUndefined();
    expect(outcomes.recorded[0]).toMatchObject({ success: false });
    expect(outcomes.recorded[0]?.error).toMatch(/Model not in registry/);
    // No request id means no waiter, so nothing is reported to orchd.
    expect(outcomes.reported).toHaveLength(0);
  });

  test("applies a thinking command directly", async () => {
    const { pi, calls } = makePi();
    const outcomes = outcomeRecorder();
    const control = createModelControl({
      harness: pi,
      context: () => undefined,
      recordOutcome: outcomes.record,
      reportOutcome: outcomes.report,
      refreshPresence: () => undefined,
    });

    await control.applyControlCommand({ cmd: "thinking", level: "high", id: "req-2" });

    expect(calls.thinking).toBe("high");
    expect(outcomes.recorded[0]).toMatchObject({ success: true, requested: { thinking: "high" } });
    expect(outcomes.reported[0]).toMatchObject({ command: "thinking", requested: { thinking: "high" } });
  });
});
