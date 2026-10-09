import { afterEach, describe, expect, test } from "bun:test";
import { allowedModelPatterns, allowlistWithDefault } from "../src/settings/read.ts";
import type { OrchDir } from "../src/types/core.ts";
import { testServices } from "./helpers/services.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

/** The default model is the one a harness launches on, so the allowlist that gates launches always holds it. */
describe("the allowlist holds the default model", () => {
  const dirs: OrchDir[] = [];
  afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

  function settingsWith(allowed: string[], recorded: string) {
    const orchDir = tempOrchDir("orch-allowlist-default-");
    dirs.push(orchDir);
    return testServices({ orchDir, settings: {
      enabled: { adapters: ["claude"], backends: ["headless"] },
      defaults: { adapter: "claude", backend: "headless", models: { claude: recorded } },
      models: { allowed: { claude: allowed } },
    } }).settings.current();
  }

  test("a hand-edited list without the default still shows and admits it", () => {
    expect(allowedModelPatterns(settingsWith(["sonnet"], "haiku"), "claude")).toEqual(["sonnet", "haiku"]);
  });

  test("a default the list already matches is not added twice", () => {
    expect(allowedModelPatterns(settingsWith(["claude-*"], "claude-haiku-4-5"), "claude")).toEqual(["claude-*"]);
  });

  test("a thinking suffix on the default is not part of the model name", () => {
    expect(allowlistWithDefault(["sonnet"], "haiku:high")).toEqual(["sonnet", "haiku"]);
  });

  test("an empty list stays empty, because it already allows every model", () => {
    expect(allowlistWithDefault([], "haiku")).toEqual([]);
  });
});
