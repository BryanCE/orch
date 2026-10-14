import { afterAll, describe, expect, test } from "bun:test";
import { registerCompaction } from "../src/agent/compaction.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { HarnessApi, HarnessCompactOptions, HarnessContext, HarnessEventHandler, HarnessResolvedModel } from "../src/types/agent.ts";

const orchDir = tempOrchDir("orch-bridge-compaction-");
writeSettingsFixture(orchDir, { workers: { compact_at_tokens: { pi: { "openai-codex/gpt-5.6-luna": 100_000 } } } });
const settings = fileSettingsManager(orchDir);
afterAll(() => removeTempDir(orchDir));

/** A harness that keeps its turn_end handler, and a context whose usage and model the test sets. */
function harnessSession(model: HarnessResolvedModel | undefined, tokens: number) {
  const handlers: HarnessEventHandler[] = [];
  const requests: HarnessCompactOptions[] = [];
  const harness: HarnessApi = {
    on: (event, handler) => { if (event === "turn_end") handlers.push(handler); },
    registerTool: () => undefined,
    registerCommand: () => undefined,
    sendUserMessage: () => undefined,
    setModel: () => Promise.resolve(true),
    getThinkingLevel: () => undefined,
    setThinkingLevel: () => undefined,
    events: { on: () => undefined },
  };
  const ctx: HarnessContext = {
    hasUI: false,
    ...(model === undefined ? {} : { model }),
    sessionManager: { getSessionFile: () => undefined, getSessionId: () => undefined, getBranch: () => [] },
    modelRegistry: { find: () => undefined },
    ui: { notify: () => undefined, setStatus: () => undefined, setWidget: () => undefined },
    isIdle: () => true,
    getContextUsage: () => ({ tokens }),
    compact: (options) => { requests.push(options); },
  };
  registerCompaction(harness, { agentId: "pi", settleEvent: "agent_settled" }, settings);
  const endTurn = (): void => { for (const handler of handlers) void handler({}, ctx); };
  return { endTurn, requests };
}

const luna = { provider: "openai-codex", id: "gpt-5.6-luna" };

describe("bridge compaction", () => {
  test("compacts once a turn ends at the point for the current model", () => {
    const session = harnessSession(luna, 100_000);
    session.endTurn();
    expect(session.requests).toHaveLength(1);
  });

  test("asks once until the running compaction settles", () => {
    const session = harnessSession(luna, 120_000);
    session.endTurn();
    session.endTurn();
    expect(session.requests).toHaveLength(1);
    session.requests[0]?.onComplete?.();
    session.endTurn();
    expect(session.requests).toHaveLength(2);
  });

  test("below the point, or on a model with no entry, the harness keeps its default", () => {
    const below = harnessSession(luna, 99_999);
    below.endTurn();
    expect(below.requests).toHaveLength(0);
    const unlisted = harnessSession({ provider: "anthropic", id: "claude-haiku-4-5" }, 500_000);
    unlisted.endTurn();
    expect(unlisted.requests).toHaveLength(0);
    const unknown = harnessSession(undefined, 500_000);
    unknown.endTurn();
    expect(unknown.requests).toHaveLength(0);
  });
});
