import { describe, expect, test } from "bun:test";
import { claudeAdapter } from "../src/adapters/claude.ts";
import { codexAdapter } from "../src/adapters/codex.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import { compactionArgs, compactionEnv } from "../src/policy/workers.ts";
import { fakeAdapter } from "./helpers/adapter.ts";
import type { WorkerPolicy } from "../src/types/policy.ts";

const workers: WorkerPolicy = {
  inheritExtensions: true,
  excludeExtensions: [],
  builtinTools: true,
  allowTools: [],
  compactAtTokens: { claude: { haiku: 100_000 }, codex: { "gpt-5.5": 150_000 }, pi: { "anthropic/claude-haiku-4-5": 90_000 } },
};

describe("launch compaction", () => {
  test("claude takes its point as env for the launch model", () => {
    expect(compactionEnv(claudeAdapter, "haiku", workers)).toEqual({ CLAUDE_CODE_AUTO_COMPACT_WINDOW: "100000" });
    expect(compactionArgs(claudeAdapter, { model: "haiku", workers })).toEqual([]);
  });

  test("codex takes its point as a config override in every launch form", () => {
    const opts = { model: "gpt-5.5", workers };
    expect(compactionEnv(codexAdapter, "gpt-5.5", workers)).toEqual({});
    expect(codexAdapter.interactiveArgv(opts)).toEqual(["codex", "--model", "gpt-5.5", "-c", "model_auto_compact_token_limit=150000"]);
    expect(codexAdapter.interactiveCmd(opts)).toContain("-c model_auto_compact_token_limit=150000");
    expect(codexAdapter.headlessCmd("go", opts)).toContain("model_auto_compact_token_limit=150000");
  });

  test("pi's launch adds nothing: its bridge compacts live", () => {
    expect(compactionEnv(piAdapter, "anthropic/claude-haiku-4-5", workers)).toEqual({});
    expect(compactionArgs(piAdapter, { model: "anthropic/claude-haiku-4-5", workers })).toEqual([]);
  });

  test("a model with no entry keeps the harness default", () => {
    expect(compactionEnv(claudeAdapter, "opus", workers)).toEqual({});
    expect(compactionEnv(claudeAdapter, undefined, workers)).toEqual({});
    expect(compactionEnv(claudeAdapter, "haiku", undefined)).toEqual({});
    expect(codexAdapter.interactiveArgv({ model: "gpt-5.4", workers })).toEqual(["codex", "--model", "gpt-5.4"]);
  });

  test("a harness that takes no compaction point gets nothing, whatever the table holds", () => {
    expect(compactionEnv(fakeAdapter({ id: "claude" }), "haiku", workers)).toEqual({});
  });
});
