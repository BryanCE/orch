import { describe, expect, test } from "bun:test";
import { Theme } from "@earendil-works/pi-coding-agent";
import { countStates, formatSeatStatus, hasTheme } from "../src/seat/index.ts";
import { reconcileDashboardSelection } from "../src/seat/ui/takeover.ts";
import { errorMessage } from "../src/util.ts";
import type { PackSnapshot } from "../src/types/seat.ts";

function snapshot(state: string, key = state): PackSnapshot {
  return {
    key,
    name: key,
    state,
    model: null,
    task: "",
    createdAt: 0,
    lastTransitionAt: 0,
    info: {},
  };
}

const plainFgColors: ConstructorParameters<typeof Theme>[0] = {
  accent: 0, border: 0, borderAccent: 0, borderMuted: 0, success: 0, error: 0, warning: 0,
  muted: 0, dim: 0, text: 0, thinkingText: 0, userMessageText: 0, customMessageText: 0,
  customMessageLabel: 0, toolTitle: 0, toolOutput: 0, mdHeading: 0, mdLink: 0, mdLinkUrl: 0,
  mdCode: 0, mdCodeBlock: 0, mdCodeBlockBorder: 0, mdQuote: 0, mdQuoteBorder: 0, mdHr: 0,
  mdListBullet: 0, toolDiffAdded: 0, toolDiffRemoved: 0, toolDiffContext: 0, syntaxComment: 0,
  syntaxKeyword: 0, syntaxFunction: 0, syntaxVariable: 0, syntaxString: 0, syntaxNumber: 0,
  syntaxType: 0, syntaxOperator: 0, syntaxPunctuation: 0, thinkingOff: 0, thinkingMinimal: 0,
  thinkingLow: 0, thinkingMedium: 0, thinkingHigh: 0, thinkingXhigh: 0, bashMode: 0,
};
const plainBgColors: ConstructorParameters<typeof Theme>[1] = {
  selectedBg: 0, userMessageBg: 0, customMessageBg: 0, toolPendingBg: 0, toolSuccessBg: 0, toolErrorBg: 0,
};

class PlainTheme extends Theme {
  constructor() {
    super(plainFgColors, plainBgColors, "truecolor");
  }

  override fg(_color: Parameters<Theme["fg"]>[0], text: string): string {
    return text;
  }
}

function plainTheme(): Theme {
  return new PlainTheme();
}

describe("seat pure seams", () => {
  test("errorMessage preserves non-Error thrown values", () => {
    expect(errorMessage("failed")).toBe("failed");
    expect(errorMessage({ reason: "failed" })).toBe("[object Object]");
  });

  test("hasTheme discriminates missing and valid themes", () => {
    expect(hasTheme({})).toBe(false);
    const theme = plainTheme();
    expect(hasTheme({ theme })).toBe(true);
  });

  test("countStates groups active, blocked, failed, and settled states", () => {
    expect(countStates([
      snapshot("working"),
      snapshot("spawning"),
      snapshot("blocked"),
      snapshot("asking"),
      snapshot("error"),
      snapshot("aborted"),
      snapshot("done"),
      snapshot("idle"),
    ])).toEqual({ working: 2, blocked: 2, failed: 2, done: 2 });
  });

  test("formatSeatStatus renders state counts and view hint", () => {
    const status = formatSeatStatus(plainTheme(), [
      snapshot("working"),
      snapshot("blocked"),
      snapshot("error"),
      snapshot("done"),
    ]);

    expect(status).toBe("orch: ■ 1 working · ■ 1 blocked · ■ 1 failed · ■ 1 done · /orch-view to view");
  });

  test("reconcileDashboardSelection preserves id and guards missing snapshots", () => {
    const selection: { id?: string; index: number } = { id: "b", index: 0 };
    reconcileDashboardSelection(selection, [{ key: "a" }, { key: "b" }]);
    expect(selection).toEqual({ id: "b", index: 1 });

    selection.id = "missing";
    selection.index = 99;
    reconcileDashboardSelection(selection, [{ key: "a" }, { key: "b" }]);
    expect(selection).toEqual({ id: "b", index: 1 });

    selection.id = "a";
    selection.index = 0;
    reconcileDashboardSelection(selection, []);
    expect(selection).toEqual({ id: undefined, index: 0 });
  });
});
