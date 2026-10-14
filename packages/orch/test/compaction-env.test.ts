import { describe, expect, test } from "bun:test";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { compactionEnv } from "../src/policy/workers.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import type { WorkerPolicy } from "../src/types/policy.ts";

const policy: WorkerPolicy = {
  inheritExtensions: true,
  excludeExtensions: [],
  builtinTools: true,
  allowTools: [],
  compactAtTokens: { claude: { haiku: 100_000 }, pi: { haiku: 90_000 } },
};

describe("launch compaction env", () => {
  test("a configured harness and model gets the harness's own env", () => {
    expect(compactionEnv(claudeAdapter, "haiku", policy)).toEqual({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: "100000" });
  });

  test("a model with no entry keeps the harness default", () => {
    expect(compactionEnv(claudeAdapter, "opus", policy)).toEqual({});
    expect(compactionEnv(claudeAdapter, undefined, policy)).toEqual({});
    expect(compactionEnv(claudeAdapter, "haiku", undefined)).toEqual({});
  });

  test("a harness that takes no compaction point gets nothing, whatever the table holds", () => {
    expect(compactionEnv(fakeAdapter({ id: "pi" }), "haiku", policy)).toEqual({});
  });
});
