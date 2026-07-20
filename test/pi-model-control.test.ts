import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  createModelControl,
  isAllowedModel,
  resolveRegistryModel,
  splitThinkingSuffix,
  type ResolvedModel,
} from "../extensions/pi/model-control.ts";

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
  return { provider, id } as unknown as ResolvedModel;
}

const noRetry = { attempts: 1, delayMs: 0 };

/** The outcome record applyControlCommand writes to control.json. */
interface ControlOutcome {
  success: boolean;
  requested?: unknown;
  error?: string;
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
    const dir = tempDir();
    const seen: { provider: string; id: string }[] = [];
    const find = (provider: string, id: string): ResolvedModel | undefined => {
      seen.push({ provider, id });
      // The registry keys on the bare id, exactly as `pi --list-models` prints it.
      return id === "gpt-5.6-luna" ? fakeModel(provider, id) : undefined;
    };
    const { model, thinking } = await resolveRegistryModel(
      "openai-codex/gpt-5.6-luna:medium",
      dir,
      find,
      noRetry,
    );
    expect(seen).toEqual([{ provider: "openai-codex", id: "gpt-5.6-luna" }]);
    expect(model).toEqual(fakeModel("openai-codex", "gpt-5.6-luna"));
    expect(thinking).toBe("medium");
  });

  test("retries until a still-booting registry answers", async () => {
    const dir = tempDir();
    let calls = 0;
    const find = (provider: string, id: string): ResolvedModel | undefined => {
      calls += 1;
      return calls >= 3 ? fakeModel(provider, id) : undefined;
    };
    const { model } = await resolveRegistryModel(
      "openai-codex/gpt-5.6-luna",
      dir,
      find,
      { attempts: 8, delayMs: 0 },
    );
    expect(calls).toBe(3);
    expect(model).toEqual(fakeModel("openai-codex", "gpt-5.6-luna"));
  });

  test("throws when the registry never yields the model", () => {
    const dir = tempDir();
    expect(
      resolveRegistryModel("openai-codex/gpt-5.6-luna:high", dir, () => undefined, noRetry),
    ).rejects.toThrow(/Model not in registry.*openai-codex\/gpt-5.6-luna$/);
  });

  test("rejects a model outside the allowlist before any registry lookup", () => {
    const dir = tempDir();
    let looked = false;
    expect(
      resolveRegistryModel("openrouter/not/allowed:low", dir, () => {
        looked = true;
        return undefined;
      }, noRetry),
    ).rejects.toThrow(/Model not allowed: openrouter\/not\/allowed/);
    expect(looked).toBe(false);
  });

  test("rejects a token without a provider/id shape", () => {
    const dir = tempDir();
    expect(
      resolveRegistryModel("gpt-5.6-luna", dir, () => undefined, noRetry),
    ).rejects.toThrow(/provider\/id string/);
  });
});

describe("isAllowedModel", () => {
  test("always allows openai-codex, applies globs to the rest", () => {
    const dir = tempDir();
    expect(isAllowedModel(dir, "openai-codex/anything")).toBe(true);
    // DEFAULT_ALLOWED_MODELS covers the two openrouter defaults exactly.
    expect(isAllowedModel(dir, "openrouter/x-ai/grok-4.5")).toBe(true);
    expect(isAllowedModel(dir, "openrouter/unknown/model")).toBe(false);
  });
});

describe("createModelControl.applyControlCommand", () => {
  function makePi() {
    const calls = {
      model: undefined as ResolvedModel | undefined,
      thinking: undefined as string | undefined,
    };
    const pi = {
      setModel: (model: ResolvedModel) => {
        calls.model = model;
        return Promise.resolve();
      },
      setThinkingLevel: (level: string) => {
        calls.thinking = level;
      },
    };
    return { pi, calls };
  }

  test("applies a suffixed model command and records a success outcome", async () => {
    const dir = tempDir();
    const controlFile = path.join(dir, "control.json");
    const { pi, calls } = makePi();
    let refreshed = 0;
    const control = createModelControl({
      pi: pi as never,
      orchDir: dir,
      context: () => ({ modelRegistry: { find: (p: string, id: string) => fakeModel(p, id) } }) as never,
      controlFile: () => controlFile,
      refreshPresence: () => {
        refreshed += 1;
      },
    });

    await control.applyControlCommand({ cmd: "model", model: "openai-codex/gpt-5.6-luna:medium" });

    expect(calls.model).toEqual(fakeModel("openai-codex", "gpt-5.6-luna"));
    expect(calls.thinking).toBe("medium");
    expect(refreshed).toBe(1);
    const outcome = JSON.parse(fs.readFileSync(controlFile, "utf8")) as ControlOutcome;
    expect(outcome.success).toBe(true);
    expect(outcome.requested).toEqual({ model: "openai-codex/gpt-5.6-luna:medium" });
  });

  test("records a failure outcome when the model is rejected", async () => {
    const dir = tempDir();
    const controlFile = path.join(dir, "control.json");
    const { pi, calls } = makePi();
    const control = createModelControl({
      pi: pi as never,
      orchDir: dir,
      context: () => ({ modelRegistry: { find: () => undefined } }) as never,
      controlFile: () => controlFile,
      refreshPresence: () => undefined,
    });

    await control.applyControlCommand({ cmd: "model", model: "openrouter/bad/model" });

    expect(calls.model).toBeUndefined();
    const outcome = JSON.parse(fs.readFileSync(controlFile, "utf8")) as ControlOutcome;
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/Model not allowed/);
  });

  test("applies a thinking command directly", async () => {
    const dir = tempDir();
    const controlFile = path.join(dir, "control.json");
    const { pi, calls } = makePi();
    const control = createModelControl({
      pi: pi as never,
      orchDir: dir,
      context: () => undefined,
      controlFile: () => controlFile,
      refreshPresence: () => undefined,
    });

    await control.applyControlCommand({ cmd: "thinking", level: "high" });

    expect(calls.thinking).toBe("high");
    const outcome = JSON.parse(fs.readFileSync(controlFile, "utf8")) as ControlOutcome;
    expect(outcome.success).toBe(true);
    expect(outcome.requested).toEqual({ thinking: "high" });
  });
});
