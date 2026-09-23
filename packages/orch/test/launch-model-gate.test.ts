import { afterEach, describe, expect, test } from "bun:test";
import { admitModel, assertModelOffered, expandModelSpec } from "../src/policy/model.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { AdapterId, AgentAdapter, HarnessModel } from "../src/types/adapter.ts";
import type { OrchDir } from "../src/types/core.ts";
import { testServices } from "./helpers/services.ts";

// A launch hands its model string to the harness CLI, whose own resolver fuzzy-matches
// a shorthand onto any registry entry sharing a prefix — "sol:high" booted a fleet on
// upstage/solar-pro-3, and "luna:high" on the pricier luna-pro. Orch rules on the token
// first, by MEMBERSHIP in what the harness says it can run: a format rule here would be
// one harness's grammar imposed on the rest, since pi names models `provider/id` while
// codex names them `gpt-5.6-luna` and claude names them `sonnet`.
const dirs: OrchDir[] = [];

function makeDir(settings: Record<string, unknown> = {}): OrchDir {
  const dir = tempOrchDir("orch-model-gate-");
  dirs.push(dir);
  writeSettingsFixture(dir, settings);
  return dir;
}

/** A harness with a catalogue, built through the typed factory so it is a COMPLETE
 *  AgentAdapter. An unchecked fixture used to keep the deleted catalogue method
 *  and hide the port change from these tests entirely — which is exactly why Rule 13
 *  requires complete typed values. */
function harness(id: AdapterId, specs: readonly string[]): AgentAdapter {
  const models: HarnessModel[] = specs.map((spec) => ({ spec }));
  return fakeAdapter({ id, models: { listModels: (): readonly HarnessModel[] => models } });
}

/** A harness that publishes no catalogue: orch has nothing to check the token against,
 *  and composes no catalogue role to say so. */
const silentHarness: AgentAdapter = fakeAdapter({ id: "codex", models: null });

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
});

describe("the model gate rules by harness membership, not by format", () => {
  const pi = harness("pi", ["openrouter/openai/gpt-5.6-sol", "openrouter/upstage/solar-pro-3"]);

  test("accepts a listed spec, with or without a thinking suffix", () => {
    const catalogue = testServices({ orchDir: makeDir() }).models;
    expect(() => assertModelOffered(pi, catalogue, "openrouter/openai/gpt-5.6-sol")).not.toThrow();
    expect(() => assertModelOffered(pi, catalogue, "openrouter/openai/gpt-5.6-sol:high")).not.toThrow();
  });

  test("refuses a ladder shorthand and names what the harness does offer", () => {
    const catalogue = testServices({ orchDir: makeDir() }).models;
    expect(() => assertModelOffered(pi, catalogue, "sol:high")).toThrow(/pi does not list model sol/);
    expect(() => assertModelOffered(pi, catalogue, "sol:high")).toThrow(/gpt-5\.6-sol/);
  });

  test("accepts each harness's own vocabulary rather than one shared grammar", () => {
    const catalogue = testServices({ orchDir: makeDir() }).models;
    expect(() => assertModelOffered(harness("codex", ["gpt-5.6-luna"]), catalogue, "gpt-5.6-luna:medium")).not.toThrow();
    expect(() => assertModelOffered(harness("claude", ["sonnet", "opus"]), catalogue, "sonnet")).not.toThrow();
    // A pi-shaped spec is wrong FOR codex, and the refusal comes from codex's list.
    expect(() => assertModelOffered(harness("codex", ["gpt-5.6-luna"]), catalogue, "openrouter/openai/gpt-5.6-sol"))
      .toThrow(/codex does not list model/);
  });

  test("cannot check a harness that publishes no catalogue, and does not pretend to", () => {
    const catalogue = testServices({ orchDir: makeDir() }).models;
    expect(() => assertModelOffered(silentHarness, catalogue, "anything-at-all")).not.toThrow();
  });
});

describe("short model names expand against the allowed harness catalogue", () => {
  test("expands a short name with one listed match", () => {
    const settings = fileSettingsManager(makeDir()).current();
    expect(expandModelSpec(settings, "codex", [{ spec: "openai-codex/gpt-5.6-luna" }], "luna"))
      .toEqual({ kind: "expanded", spec: "openai-codex/gpt-5.6-luna", from: "luna" });
  });

  test("reports multiple matches as ambiguous in sorted order", () => {
    const settings = fileSettingsManager(makeDir()).current();
    expect(expandModelSpec(settings, "codex", [
      { spec: "openai-codex/gpt-5.6-luna" },
      { spec: "openai-codex/gpt-5.6-gpt" },
    ], "gpt"))
      .toEqual({
        kind: "ambiguous",
        from: "gpt",
        candidates: ["openai-codex/gpt-5.6-gpt", "openai-codex/gpt-5.6-luna"],
      });
  });

  test("passes through a full listed spec", () => {
    const settings = fileSettingsManager(makeDir()).current();
    expect(expandModelSpec(settings, "codex", [{ spec: "openai-codex/gpt-5.6-luna" }], "openai-codex/gpt-5.6-luna"))
      .toEqual({ kind: "listed", spec: "openai-codex/gpt-5.6-luna" });
  });

  test("does not expand a match excluded by models.allowed", () => {
    const settings = fileSettingsManager(makeDir({ models: { allowed: { codex: ["openai-codex/gpt-5.6-sol"] } } })).current();
    expect(expandModelSpec(settings, "codex", [{ spec: "openai-codex/gpt-5.6-luna" }], "luna"))
      .toEqual({ kind: "unlisted", from: "luna" });
  });
});

describe("the settings allowlist applies on top of harness membership", () => {
  const pi = harness("pi", ["openrouter/openai/gpt-5.6-luna", "openrouter/upstage/solar-pro-3"]);

  test("an empty allowlist restricts nothing beyond the harness list", () => {
    const dir = makeDir();
    const catalogue = testServices({ orchDir: dir }).models;
    expect(admitModel(fileSettingsManager(dir).current(), pi, catalogue, "openrouter/upstage/solar-pro-3")).toBe("openrouter/upstage/solar-pro-3");
  });

  test("a configured allowlist refuses a listed model outside its patterns", () => {
    const dir = makeDir({ models: { allowed: { pi: ["openrouter/openai/*"] } } });
    const catalogue = testServices({ orchDir: dir }).models;
    expect(admitModel(fileSettingsManager(dir).current(), pi, catalogue, "openrouter/openai/gpt-5.6-luna:high")).toBe("openrouter/openai/gpt-5.6-luna:high");
    expect(() => admitModel(fileSettingsManager(dir).current(), pi, catalogue, "openrouter/upstage/solar-pro-3")).toThrow(/models\.allowed/);
  });

  test("a spec no harness lists is refused by the harness, not the allowlist", () => {
    const dir = makeDir({ models: { allowed: { pi: ["openrouter/openai/*"] } } });
    const catalogue = testServices({ orchDir: dir }).models;
    expect(() => admitModel(fileSettingsManager(dir).current(), pi, catalogue, "nothing-like-it:high")).toThrow(/pi does not list model/);
  });

  test("the configured default is admitted though the allowlist omits it", () => {
    const dir = makeDir({ defaults: { models: { pi: "openrouter/upstage/solar-pro-3:high" } }, models: { allowed: { pi: ["openrouter/openai/*"] } } });
    const catalogue = testServices({ orchDir: dir }).models;
    expect(admitModel(fileSettingsManager(dir).current(), pi, catalogue, "openrouter/upstage/solar-pro-3")).toBe("openrouter/upstage/solar-pro-3");
  });
});

// The retrospective case: the rules say `luna:high`, the harness lists
// `openrouter/openai/gpt-5.6-luna`, and the refusal used to know the answer and
// still make the caller retype it. Admission expands the short name once, at the
// gate every verb shares, and hands back the spec the harness receives.
describe("admission expands a short name through the same gate", () => {
  const pi = harness("pi", ["openrouter/openai/gpt-5.6-luna", "openrouter/upstage/solar-pro-3"]);

  test("expands a short name and keeps its thinking suffix", () => {
    const dir = makeDir();
    const catalogue = testServices({ orchDir: dir }).models;
    expect(admitModel(fileSettingsManager(dir).current(), pi, catalogue, "luna:high")).toBe("openrouter/openai/gpt-5.6-luna:high");
    expect(admitModel(fileSettingsManager(dir).current(), pi, catalogue, "luna")).toBe("openrouter/openai/gpt-5.6-luna");
  });

  test("refuses an ambiguous short name by naming every candidate", () => {
    const dir = makeDir();
    const catalogue = testServices({ orchDir: dir }).models;
    const both = harness("pi", ["openrouter/openai/gpt-5.6-luna", "openrouter/openai/gpt-5.6-luna-pro"]);
    expect(() => admitModel(fileSettingsManager(dir).current(), both, catalogue, "luna:high")).toThrow(/matches several pi models \(openrouter\/openai\/gpt-5\.6-luna, openrouter\/openai\/gpt-5\.6-luna-pro\)/);
  });

  test("a short name whose only matches the allowlist excludes is an allowlist refusal", () => {
    const dir = makeDir({ models: { allowed: { pi: ["openrouter/upstage/*"] } } });
    const catalogue = testServices({ orchDir: dir }).models;
    expect(() => admitModel(fileSettingsManager(dir).current(), pi, catalogue, "luna:high")).toThrow(/matches only openrouter\/openai\/gpt-5\.6-luna, none in models\.allowed\.pi/);
  });

  test("the allowlist narrows an otherwise ambiguous short name to one match", () => {
    const dir = makeDir({ models: { allowed: { pi: ["openrouter/openai/gpt-5.6-luna"] } } });
    const catalogue = testServices({ orchDir: dir }).models;
    const both = harness("pi", ["openrouter/openai/gpt-5.6-luna", "openrouter/openai/gpt-5.6-luna-pro"]);
    expect(admitModel(fileSettingsManager(dir).current(), both, catalogue, "luna:low")).toBe("openrouter/openai/gpt-5.6-luna:low");
  });
});
