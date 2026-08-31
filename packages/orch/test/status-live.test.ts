import { describe, expect, test } from "bun:test";
import { formatStatusTable } from "../src/commands/status.ts";
import { CLEAR_SCREEN } from "../src/tui/screen.ts";
import { createRefreshController, renderLiveStatus } from "../src/commands/status-live.ts";
import type { StatusRow } from "../src/types/command.ts";

const fixture: StatusRow = {
  key: "agent-fixture",
  paneId: "pane-1",
  managed: true,
  name: "worker-one",
  tab: "tab-a",
  agent: "pi",
  owner: null,
  spawnedBy: null,
  spawnedByLabel: null,
  worktree: null,
  branch: null,
  cwd: null,
  focused: false,
  model: "test/model",
  modelShort: "test/model",
  state: "working",
  stateFallback: false,
  staleExtension: false,
  exited: false,
  alive: true,
  cost: 0,
  ctxPercent: null,
  task: "fixture task",
  dispatchId: null,
  lastText: "fixture output",
  backendStatus: null,
  backend: null,
  capabilities: null,
  sessionPath: null,
  presenceDir: null,
  presenceOnly: false,
  tokens: null,
  turns: null,
};

describe("live status renderer", () => {
  test("renders a clear screen, timestamped header, and table body", () => {
    const frame = renderLiveStatus([fixture], { all: false, host: false }, new Date(2026, 6, 16, 9, 8, 7));
    expect(frame.startsWith(CLEAR_SCREEN)).toBe(true);
    expect(frame).toContain("1 agents");
    expect(frame).toContain("updated 09:08:07");
    expect(frame).toContain("PANE");
    expect(frame).toContain("worker-one");
    expect(frame).toContain("working");
  });

  test("renders a refresh failure in the header area", () => {
    const frame = renderLiveStatus([fixture], { all: false, host: false }, new Date(2026, 6, 16, 9, 8, 7), "daemon unreachable - retrying on next event");
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
    const table = formatStatusTable([fixture], { all: false, host: false });
    expect(table).toContain("STATE");
  });
});
