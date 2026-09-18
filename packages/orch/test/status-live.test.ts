import { describe, expect, test } from "bun:test";
import { formatStatusTable } from "../src/commands/status/table.ts";
import { CLEAR_SCREEN } from "../src/tui/screen.ts";
import { createRefreshController, renderLiveStatus } from "../src/commands/status/live.ts";
import { fleetFixture, statusRowFixture } from "./helpers/status-row.ts";

const fixture = fleetFixture([statusRowFixture({
  key: "agent-fixture", paneId: "pane-1", name: "worker-one", tab: "tab-a", agent: "pi",
  model: "test/model", state: "working", task: "fixture task", lastText: "fixture output",
})]);

describe("live status renderer", () => {
  test("renders a clear screen, timestamped header, and table body", () => {
    const frame = renderLiveStatus(fixture, { spaceWide: false, host: false, columns: new Set() }, new Date(2026, 6, 16, 9, 8, 7));
    expect(frame.startsWith(CLEAR_SCREEN)).toBe(true);
    expect(frame).toContain("1 agents");
    expect(frame).toContain("updated 09:08:07");
    expect(frame).toContain("ID");
    expect(frame).toContain("ENV");
    expect(frame).toContain("worker-one");
    expect(frame).toContain("working");
  });

  test("renders a refresh failure in the header area", () => {
    const frame = renderLiveStatus(fixture, { spaceWide: false, host: false, columns: new Set() }, new Date(2026, 6, 16, 9, 8, 7), "daemon unreachable - retrying on next event");
    expect(frame).toContain("daemon unreachable - retrying on next event");
  });

  test("coalesces a burst into one pending follow-up refresh", async () => {
    let calls = 0;
    let releaseFirst: (() => void) | undefined;
    const first = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const controller = createRefreshController(async () => {
      calls += 1;
      if (calls === 1) await first;
    });

    controller.trigger();
    controller.trigger();
    controller.trigger();
    expect(calls).toBe(1);
    expect(controller.state).toBe("running-with-pending");

    releaseFirst?.();
    await first;
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toBe(2);
    expect(controller.state).toBe("idle");
  });

  test("keeps the existing table renderer available", () => {
    const table = formatStatusTable(fixture, { spaceWide: false, host: false, columns: new Set() });
    expect(table).toContain("STATE");
  });
});
