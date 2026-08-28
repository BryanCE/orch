import { afterAll, describe, expect, mock, test } from "bun:test";
import type { AgentAdapter } from "../src/adapters/adapter.ts";
import { projectRoot } from "../src/util.ts";
import type { NotifyEvent } from "../src/notify/format.ts";

const herdrArgv: string[][] = [];
const launched = new Set<string>();
void mock.module("../src/backends/herdr/cli.ts", () => ({
  herdrPanes: () => [{ pane_id: "w6:p9", workspace_id: "ws-test" }],
  herdrJSON: (args: string[]) => {
    herdrArgv.push([...args]);
    // herdr answers `pane run` with an empty body, never JSON.
    if (args[0] === "pane" && args[1] === "run") throw new Error(`herdr ${args.join(" ")} returned non-JSON: `);
    launched.delete("w6:p10");
    if (args[0] === "pane" && args[1] === "split") return { pane: { pane_id: "w6:p10" } };
    return { tab: { tab_id: "t6", workspace_id: "ws-test" }, root_pane: { pane_id: "w6:p10" } };
  },
  herdrAck: (args: string[]) => {
    herdrArgv.push([...args]);
    if (args[0] === "pane" && args[1] === "run") launched.add(args[2] ?? "");
  },
  herdrBestEffort: (args: string[]) => {
    herdrArgv.push([...args]);
    return true;
  },
  herdrNames: () => new Map(),
  herdrTabs: () => new Map(),
  herdrReachable: () => true,
  paneStatus: () => null,
  // A pane runs its shell until the launch line lands, then the harness owns the
  // terminal — the transition spawn verifies before calling a launch done.
  herdrExec: (args: string[]) => {
    const running = launched.has(args[3] ?? "");
    return JSON.stringify({ result: { process_info: {
      shell_pid: 100,
      foreground_process_group_id: running ? 200 : 100,
      foreground_processes: [{ name: running ? "pi" : "bash" }],
    } } });
  },
}));

/** The last call herdr received for one command, so an assertion names what it
 *  means instead of counting backwards past the launch checks. */
function lastCall(command: string, subcommand: string): string[] | undefined {
  return herdrArgv.filter((args) => args[0] === command && args[1] === subcommand).at(-1);
}

// Spawn splits a caller pane when one exists, so the real one must not leak in
// when this suite is run from inside herdr.
const callerPane = process.env.HERDR_PANE_ID;
delete process.env.HERDR_PANE_ID;

const { HerdrBackend } = await import("../src/backends/herdr/index.ts");
const { emitAndNotify } = await import("../src/daemon/events.ts");
const { notificationText } = await import("../src/notify/format.ts");

const adapter: AgentAdapter = {
  id: "pi",
  capabilities: { steer: "none", ask: false, setModel: false, sessionTail: false, registersPresenceOnStart: false, lifecycle: [], enforcesCommandLocks: false },
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

afterAll(() => {
  mock.restore();
  if (callerPane === undefined) delete process.env.HERDR_PANE_ID;
  else process.env.HERDR_PANE_ID = callerPane;
});

describe("herdr and notification hardening", () => {
  test("uses a non-empty agent name and preserves shell command as one argv value", () => {
    const backend = new HerdrBackend();
    const handle = backend.spawn(adapter, { cwd: "/tmp/work dir", workspace: "ws-test", key: "  " });

    expect(handle).toBe("w6:p10");
    expect(lastCall("pane", "rename")).toEqual(["pane", "rename", "w6:p10", "pi-"]);
    // ONE argv value, shell-quoted: herdr joins separate words with plain spaces,
    // which strips the quoting and launches the harness with no arguments.
    expect(lastCall("pane", "run")).toEqual([
      "pane", "run", "w6:p10", `bash -lc 'printf '\\''quoted "value" spaces $HOME'\\'''`,
    ]);
    expect(lastCall("tab", "create")).toContain("/tmp/work dir");
    expect(lastCall("tab", "create")).toContain(`ORCH_PROJECT=${projectRoot()}`);
  });

  test("falls back to a real name when an adapter id is blank", () => {
    const blankAdapter = { ...adapter, id: "" as AgentAdapter["id"] };
    new HerdrBackend().spawn(blankAdapter, { workspace: "ws-test" });
    expect(lastCall("pane", "rename")?.[3]).toBe("agent-agent");
    expect(lastCall("pane", "rename")?.[3]?.trim()).not.toBe("");
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
