import { describe, expect, test } from "bun:test";
import { TAB_FIRST_WORDS, TAB_LABEL_ATTEMPTS, TAB_SECOND_WORDS, freeTabLabel, liveTabLabels, rollTabLabel, type RandomSource } from "../src/commands/spawn/tab-label.ts";
import { SpawnRefusalError } from "../src/refusal.ts";
import { agentViewFixture } from "./helpers/views.ts";
import { presenceEntryFixture } from "./helpers/presence.ts";
import type { Backend, BackendTarget } from "../src/types/backend.ts";
import type { AgentView } from "../src/types/store.ts";
import type { PresenceEntry } from "../src/types/presence.ts";

/** A random source that answers `draws` in order, then repeats the last one. */
function draws(values: readonly number[]): RandomSource {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function tabTarget(handle: string, groupLabel: string): BackendTarget {
  return { handle, workspace: "w1", group: `group-${handle}`, groupLabel, name: null, agent: null, focused: false, status: null, sessionPath: null };
}

describe("spawn rolls a tab label when --tab names none", () => {
  test("both word lists hold 50 distinct short lowercase words", () => {
    for (const words of [TAB_FIRST_WORDS, TAB_SECOND_WORDS]) {
      expect(words.length).toBe(50);
      expect(new Set(words).size).toBe(50);
      for (const word of words) expect(word).toMatch(/^[a-z]{2,8}$/);
    }
  });

  test("a label is <first>-<second>-<NN>, numbered 01 to 99", () => {
    expect(rollTabLabel(draws([0, 0, 0]))).toBe("elk-glacier-01");
    expect(rollTabLabel(draws([0.999, 0.999, 0.999]))).toBe("zebra-monsoon-99");
  });

  test("a label a live tab carries is rerolled", () => {
    expect(freeTabLabel(new Set(["elk-glacier-01"]), draws([0, 0, 0, 0, 0, 0.02]))).toBe("elk-glacier-02");
  });

  test("a spawn that never rolls a free label is refused with the fix", () => {
    const random = draws([0]);
    expect(() => freeTabLabel(new Set(["elk-glacier-01"]), random)).toThrow(SpawnRefusalError);
    expect(() => freeTabLabel(new Set(["elk-glacier-01"]), random)).toThrow(`after ${TAB_LABEL_ATTEMPTS} rolls`);
  });

  test("only tabs holding a live agent on this plexer are taken; a dead agent's tab is free", () => {
    const views = new Map<string, AgentView>([
      ["live", agentViewFixture("live", { environment: { plexer: "herdr", handle: "p1" } })],
      ["dead", agentViewFixture("dead", { environment: { plexer: "herdr", handle: "p2" } })],
      ["other", agentViewFixture("other", { environment: { plexer: "tmux", handle: "p3" } })],
    ]);
    const presence = new Map<string, PresenceEntry>([
      ["live", presenceEntryFixture({ key: "live", alive: true })],
      ["dead", presenceEntryFixture({ key: "dead", alive: false })],
      ["other", presenceEntryFixture({ key: "other", alive: true })],
    ]);
    const targets = [tabTarget("p1", "elk-glacier-01"), tabTarget("p2", "otter-ember-07"), tabTarget("p3", "fox-dune-03")];
    const backend: Pick<Backend, "id" | "placementInventory"> = { id: "herdr", placementInventory: { current: () => null, list: () => targets, coordinateOf: () => null } };
    expect([...liveTabLabels(backend, views, presence)]).toEqual(["elk-glacier-01"]);
  });
});
