import { afterAll, describe, expect, test } from "bun:test";
import { fakeAdapter as makeFakeAdapter } from "./helpers/adapter.ts";
import { AGENT_START_TIMEOUT_MS, setHerdrExecutor } from "../src/backends/herdr/cli.ts";
import { projectRoot } from "../src/util.ts";
import type { AgentAdapter } from "../src/types/adapter.ts";
import type { NotifyEvent } from "../src/types/notify.ts";

// Stubbing the cli module replaces it for every test file in the process, which
// silently hands the next suite these fixtures instead of its own. The cli
// already exposes the process runner as a seam, so the fake goes there: one
// suite's fake cannot outlive its own restore, and the real argv building,
// parsing and error wrapping stay under test.
const herdrArgv: string[][] = [];
const launched = new Set<string>();

/** A pane runs its shell until the launch line lands, then the harness owns the
 *  terminal - the transition spawn verifies before calling a launch done. */
function paneProcessInfo(pane: string): string {
  const running = launched.has(pane);
  return JSON.stringify({ result: { process_info: {
    shell_pid: 100,
    foreground_process_group_id: running ? 200 : 100,
    foreground_processes: [{ name: running ? "pi" : "bash" }],
  } } });
}

const restoreExecutor = setHerdrExecutor((_command, args) => {
  herdrArgv.push([...args]);
  const [command, subcommand] = args;
  if (command === "pane" && subcommand === "process-info") return paneProcessInfo(args[3] ?? "");
  if (command === "pane" && subcommand === "list") return JSON.stringify({ panes: [{ pane_id: "w6:p9", workspace_id: "ws-test" }] });
  if (command === "agent" && subcommand === "list") return JSON.stringify({ agents: [] });
  if (command === "tab" && subcommand === "list") return JSON.stringify({ tabs: [] });
  if (command === "tab" && subcommand === "create") {
    return JSON.stringify({ tab: { tab_id: "t6", workspace_id: "ws-test" }, root_pane: { pane_id: "w6:p10" } });
  }
  if (command === "pane" && subcommand === "split") return JSON.stringify({ pane: { pane_id: "w6:p10" } });
  if (command === "pane" && subcommand === "run") launched.add(args[2] ?? "");
  // Every mutation answers with an empty body, never JSON.
  return "";
});

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

// Arguments that would be mangled by a shell round-trip: spaces, quotes and a
// variable that must NOT expand. herdr quotes for the target shell itself, so
// orch hands them over raw and one entry each.
const adapter = makeFakeAdapter({
  interactiveCmd: () => `printf 'quoted "value" spaces $HOME'`,
  interactiveArgv: () => ["printf", 'quoted "value" spaces $HOME'],
});

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
  restoreExecutor();
  if (callerPane === undefined) delete process.env.HERDR_PANE_ID;
  else process.env.HERDR_PANE_ID = callerPane;
});

describe("herdr and notification hardening", () => {
  test("uses a non-empty agent name and preserves shell command as one argv value", () => {
    const backend = new HerdrBackend();
    const handle = backend.spawn(adapter, { cwd: "/tmp/work dir", workspace: "ws-test", key: "  " });

    expect(handle).toBe("w6:p10");
    expect(lastCall("pane", "rename")).toEqual(["pane", "rename", "w6:p10", "pi-agent"]);
    // Canonical herdr launch: herdr selects the harness executable from --kind and
    // appends what follows `--`, so orch sends ARGUMENTS only — never the binary.
    // Each argument stays one argv entry, unquoted: herdr applies the target
    // shell's quoting itself, and pre-quoting here would export the quotes.
    expect(lastCall("agent", "start")).toEqual([
      "agent", "start", "pi-agent", "--kind", "pi", "--pane", "w6:p10", "--timeout", String(AGENT_START_TIMEOUT_MS),
      "--", 'quoted "value" spaces $HOME',
    ]);
    expect(lastCall("tab", "create")).toContain("/tmp/work dir");
    expect(lastCall("tab", "create")).toContain(`ORCH_PROJECT=${projectRoot()}`);
  });

  test("falls back to a valid name when the identity key contains herdr-invalid separators", () => {
    // A NEGATIVE case: orch never mints a key like this, and the pane namer must
    // still produce a name herdr accepts rather than passing separators through.
    new HerdrBackend().spawn(adapter, { workspace: "ws-test", key: "herdr~ws-test~ABC_123" });
    const name = lastCall("pane", "rename")?.[3] ?? "";
    expect(name).toBe("pi-abc_123");
    expect(name).toMatch(/^[a-z][a-z0-9_-]{0,31}$/);
  });

  test("falls back to a real name when an adapter id is blank", () => {
    const blankAdapter = { ...adapter, id: "" as AgentAdapter["id"] };
    new HerdrBackend().spawn(blankAdapter, { workspace: "ws-test" });
    expect(lastCall("pane", "rename")?.[3]).toBe("agent-agent");
    expect(lastCall("pane", "rename")?.[3]?.trim()).not.toBe("");
  });

  test("nameless notifications use a space label, never a bare pane key", () => {
    const title = notificationText(event(), { colorize: false }).title;
    expect(title).toContain("[space]");
    expect(title).not.toContain("[space] p9:");

    let emitted: NotifyEvent | undefined;
    emitAndNotify((value) => { emitted = value; }, [], event());
    expect(emitted?.space).toBe("space");
    expect(emitted?.agent).toBe("space/agent-p9");
    expect(emitted?.agent).not.toContain("p9:");
  });
});
