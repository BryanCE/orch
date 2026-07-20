import { afterAll, describe, expect, mock, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";
import type { NotifyEvent } from "../src/notify/format.ts";

const herdrArgv: string[][] = [];
void mock.module("../src/backends/herdr/cli.ts", () => ({
  herdrPanes: () => [{ pane_id: "w6:p9", workspace_id: "ws-test" }],
  herdrJSON: (args: string[]) => {
    herdrArgv.push([...args]);
    return { agent: { pane_id: "w6:p10" } };
  },
  herdrBestEffort: (args: string[]) => {
    herdrArgv.push([...args]);
    return true;
  },
  herdrNames: () => new Map(),
  herdrTabs: () => new Map(),
  herdrReachable: () => true,
  paneStatus: () => null,
  herdrExec: () => "",
}));

const { HerdrBackend } = await import("../src/backends/herdr/index.ts");
const { emitAndNotify } = await import("../src/daemon/events.ts");
const { notificationText } = await import("../src/notify/format.ts");

const adapter: AgentAdapter = {
  id: "pi",
  caps: { steer: "none", ask: false, setModel: false, sessionTail: false, lifecycle: [], enforcesCommandLocks: false },
  interactiveCmd: () => `printf 'quoted "value" spaces $HOME'`,
  headlessCmd: () => ["true"],
  detectState: () => "unknown",
  steer: () => undefined,
  answer: () => undefined,
  extractResult: () => undefined,
};

function event(overrides: Partial<NotifyEvent> = {}): NotifyEvent {
  return {
    key: "p9",
    agent: null,
    tab: null,
    model: null,
    oldState: "working",
    newState: "done",
    ts: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

afterAll(() => mock.restore());

describe("herdr and notification hardening", () => {
  test("uses a non-empty agent name and preserves shell command as one argv value", () => {
    const backend = new HerdrBackend();
    const handle = backend.spawn(adapter, { cwd: "/tmp/work dir", key: "  " });

    expect(handle).toBe("w6:p10");
    expect(herdrArgv.at(-1)).toEqual([
      "agent", "start", "pi-", "--workspace", "ws-test", "--cwd", "/tmp/work dir",
      "--no-focus", "--", "bash", "-lc", `printf 'quoted "value" spaces $HOME'`,
    ]);
  });

  test("falls back to a real name when an adapter id is blank", () => {
    const blankAdapter = { ...adapter, id: "" as AgentAdapter["id"] };
    new HerdrBackend().spawn(blankAdapter, {});
    expect(herdrArgv.at(-1)?.[2]).toBe("agent-agent");
    expect(herdrArgv.at(-1)?.[2]?.trim()).not.toBe("");
  });

  test("nameless notifications use a workspace label, never a bare pane key", () => {
    const title = notificationText(event(), { colorize: false }).title;
    expect(title).toContain("[workspace]");
    expect(title).not.toContain("[workspace] p9:");

    let emitted: unknown;
    emitAndNotify((value) => { emitted = value; }, [], event());
    const canonical = emitted as NotifyEvent;
    expect(canonical.workspace).toBe("workspace");
    expect(canonical.agent).toBe("workspace/agent-p9");
    expect(canonical.agent).not.toContain("p9:");
  });
});
