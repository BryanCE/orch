import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { assertModelAllowed, assertModelOffered } from "../src/policy/model.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { AdapterId, AgentAdapter, HarnessModel } from "../src/types/adapter.ts";

// A launch hands its model string to the harness CLI, whose own resolver fuzzy-matches
// a shorthand onto any registry entry sharing a prefix — "sol:high" booted a fleet on
// upstage/solar-pro-3, and "luna:high" on the pricier luna-pro. Orch rules on the token
// first, by MEMBERSHIP in what the harness says it can run: a format rule here would be
// one harness's grammar imposed on the rest, since pi names models `provider/id` while
// codex names them `gpt-5.6-luna` and claude names them `sonnet`.
const dirs: string[] = [];

function makeDir(settings: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-model-gate-"));
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
    expect(() => assertModelOffered(pi, "openrouter/openai/gpt-5.6-sol")).not.toThrow();
    expect(() => assertModelOffered(pi, "openrouter/openai/gpt-5.6-sol:high")).not.toThrow();
  });

  test("refuses a ladder shorthand and names what the harness does offer", () => {
    expect(() => assertModelOffered(pi, "sol:high")).toThrow(/pi does not list model sol/);
    expect(() => assertModelOffered(pi, "sol:high")).toThrow(/gpt-5\.6-sol/);
  });

  test("accepts each harness's own vocabulary rather than one shared grammar", () => {
    expect(() => assertModelOffered(harness("codex", ["gpt-5.6-luna"]), "gpt-5.6-luna:medium")).not.toThrow();
    expect(() => assertModelOffered(harness("claude", ["sonnet", "opus"]), "sonnet")).not.toThrow();
    // A pi-shaped spec is wrong FOR codex, and the refusal comes from codex's list.
    expect(() => assertModelOffered(harness("codex", ["gpt-5.6-luna"]), "openrouter/openai/gpt-5.6-sol"))
      .toThrow(/codex does not list model/);
  });

  test("cannot check a harness that publishes no catalogue, and does not pretend to", () => {
    expect(() => assertModelOffered(silentHarness, "anything-at-all")).not.toThrow();
  });
});

describe("the settings allowlist applies on top of harness membership", () => {
  const pi = harness("pi", ["openrouter/openai/gpt-5.6-luna", "openrouter/upstage/solar-pro-3"]);

  test("an empty allowlist restricts nothing beyond the harness list", () => {
    const dir = makeDir();
    expect(() => assertModelAllowed(dir, pi, "openrouter/upstage/solar-pro-3")).not.toThrow();
  });

  test("a configured allowlist refuses a listed model outside its patterns", () => {
    const dir = makeDir({ models: { allowed: { pi: ["openrouter/openai/*"] } } });
    expect(() => assertModelAllowed(dir, pi, "openrouter/openai/gpt-5.6-luna:high")).not.toThrow();
    expect(() => assertModelAllowed(dir, pi, "openrouter/upstage/solar-pro-3")).toThrow(/models\.allowed/);
  });

  test("harness membership is checked before the allowlist, so the message names the harness", () => {
    const dir = makeDir({ models: { allowed: { pi: ["openrouter/openai/*"] } } });
    expect(() => assertModelAllowed(dir, pi, "luna:high")).toThrow(/pi does not list model/);
  });
});
