import { describe, expect, test } from "bun:test";
import { displayValue } from "../src/settings/display.ts";
import {
  BROWSE_KEYBAR,
  inputOverlay,
  multiOverlay,
  selectOverlay,
  settingsFrame,
  stripAnsi,
  visibleEntryIndices,
  windowBounds,
} from "../src/settings/view.ts";
import type { EditorSetting, SettingKind, SettingSpec } from "../src/types/settings.ts";
import type { SettingsScreen } from "../src/settings/view.ts";

function entry(key: string, value: unknown, options?: {
  readonly kind?: SettingKind;
  readonly source?: string;
  readonly override?: string;
  readonly writable?: boolean;
}): EditorSetting {
  const spec: SettingSpec = {
    key,
    group: key.split(".")[0] ?? key,
    help: `Help for ${key}`,
    type: options?.kind ?? { kind: "text" },
    read: () => value,
    ...(options?.writable === false ? {} : { write: () => undefined }),
  };
  return {
    spec,
    value,
    ...(options?.source === undefined ? {} : { source: options.source }),
    ...(options?.override === undefined ? {} : { override: options.override }),
  };
}

function screen(entries: readonly EditorSetting[], overrides?: Partial<SettingsScreen>): SettingsScreen {
  return {
    file: "/tmp/orch/settings.json",
    entries,
    focusedIndex: 0,
    filter: "",
    status: undefined,
    ...overrides,
  };
}

describe("settings view", () => {
  test("visibleEntryIndices matches key and group case-insensitively", () => {
    const entries = [entry("daemon.tcp_port", 1), entry("fleet.max_depth", 2), entry("timeouts.wait_ms", 3)];
    expect(visibleEntryIndices(entries, "")).toEqual([0, 1, 2]);
    expect(visibleEntryIndices(entries, "FLEET")).toEqual([1]);
    expect(visibleEntryIndices(entries, "ms")).toEqual([2]);
    expect(visibleEntryIndices(entries, "nothing-matches")).toEqual([]);
  });

  test("windowBounds keeps the focus inside the budget and clamps at both ends", () => {
    expect(windowBounds(10, 0, 20)).toEqual({ start: 0, end: 10 });
    expect(windowBounds(50, 0, 10)).toEqual({ start: 0, end: 10 });
    expect(windowBounds(50, 49, 10)).toEqual({ start: 40, end: 50 });
    const middle = windowBounds(50, 25, 10);
    expect(middle.end - middle.start).toBe(10);
    expect(middle.start).toBeLessThanOrEqual(25);
    expect(middle.end).toBeGreaterThan(25);
  });

  test("frame shows group headers, values, provenance tags, and the focused help", () => {
    const frame = stripAnsi(settingsFrame(
      screen([
        entry("daemon.tcp_port", 3716, { source: "default" }),
        entry("fleet.max_depth", 1, { override: "ORCH_DEPTH" }),
        entry("runtime", "bun", { writable: false }),
      ]),
      100,
      40,
      undefined,
      BROWSE_KEYBAR,
    ));
    expect(frame).toContain("orch settings");
    expect(frame).toContain("daemon.tcp_port");
    expect(frame).toContain("3716");
    expect(frame).toContain("[default]");
    expect(frame).toContain("[env: ORCH_DEPTH]");
    expect(frame).toContain("[read-only]");
    expect(frame).toContain("Help for daemon.tcp_port");
    expect(frame).toContain(BROWSE_KEYBAR);
  });

  test("frame with a filter narrows the list and draws the filter line", () => {
    const frame = stripAnsi(settingsFrame(
      screen(
        [entry("daemon.tcp_port", 3716), entry("fleet.max_depth", 1)],
        { filter: "fleet", focusedIndex: 1 },
      ),
      100,
      40,
      undefined,
      BROWSE_KEYBAR,
    ));
    expect(frame).toContain("filter: fleet");
    expect(frame).toContain("fleet.max_depth");
    expect(frame).not.toContain("daemon.tcp_port");
  });

  test("frame reports an empty filter match instead of a blank screen", () => {
    const frame = stripAnsi(settingsFrame(
      screen([entry("daemon.tcp_port", 3716)], { filter: "zzz" }),
      100,
      40,
      undefined,
      BROWSE_KEYBAR,
    ));
    expect(frame).toContain('no settings match "zzz"');
  });

  test("a long list is windowed with more-above/more-below markers", () => {
    const entries = Array.from({ length: 60 }, (_, index) => entry(`group${index}.key`, index));
    const frame = stripAnsi(settingsFrame(screen(entries, { focusedIndex: 30 }), 100, 24, undefined, BROWSE_KEYBAR));
    expect(frame).toContain("more");
    expect(frame.split("\n").length).toBeLessThanOrEqual(24);
  });

  test("overlays render choices, checkboxes, and input with error", () => {
    expect(stripAnsi(selectOverlay(["rows", "columns"], 1).join("\n"))).toContain("(*) columns");
    const multi = stripAnsi(multiOverlay(["pi", "claude"], 0, ["claude"]).join("\n"));
    expect(multi).toContain("[x] claude");
    expect(multi).toContain("[ ] pi");
    const input = stripAnsi(inputOverlay("daemon.tcp_port", "3716", "expected an integer").join("\n"));
    expect(input).toContain("daemon.tcp_port = 3716");
    expect(input).toContain("expected an integer");
  });

  test("a checkbox row shows what its choice carries", () => {
    const rows = stripAnsi(multiOverlay(
      ["desktop", "command", "sound"],
      1,
      ["desktop", "command"],
      { command: "orch-ding" },
    ).join("\n")).split("\n");
    expect(rows[1]).toContain("[x] command  orch-ding");
    // A choice with nothing to carry is not padded out to make room for a column it has no
    // value in - the checkbox is the whole row.
    expect(rows[0]).toContain("[x] desktop");
    expect(rows[0]).not.toContain("desktop ");
  });

  test("displayValue keeps scalars bare and JSON-encodes shapes", () => {
    expect(displayValue(true)).toBe("true");
    expect(displayValue(3716)).toBe("3716");
    expect(displayValue({ pi: "luna" })).toBe('{"pi":"luna"}');
    expect(displayValue(["a", "b"])).toBe('["a","b"]');
  });
});
