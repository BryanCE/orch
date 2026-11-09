import { bindHeldInput, heldBackend } from "../src/backends/held/index.ts";
import { describe, expect, test } from "bun:test";
import { PtyHold } from "../src/daemon/server/held.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import type { HeldTerminal, PtyExit } from "../src/types/pty.ts";
import { FakePtyProvider } from "./helpers/fake-pty.ts";

const REQUEST = { file: "sh", args: ["-c", "agent"], cwd: "/work", env: { HOME: "/home/agent" } };

/** The holder keeps a PTY the same whatever it is for; a login needs no agent row behind it. */
function login(id: string): HeldTerminal {
  return { kind: "login", id };
}

function holder(): { hold: PtyHold; provider: FakePtyProvider } {
  const provider = new FakePtyProvider();
  return { hold: new PtyHold(provider, () => SETTINGS_DEFAULTS.pty), provider };
}

function ignore(): void {
  // A viewer that wants only the other half of the feed.
}

/** The next chunk a subscriber gets, once the held screen has taken it. */
function nextChunk(hold: PtyHold, terminal: HeldTerminal): Promise<string> {
  return new Promise((resolve) => {
    const stop = hold.subscribe(terminal, (data) => { stop(); resolve(data); }, ignore);
  });
}

describe("the PTY holder", () => {
  test("starts the program in a PTY sized and typed by the pty settings", async () => {
    const { hold, provider } = holder();
    const started = await hold.start("agent-a", REQUEST);
    const pty = provider.last();
    expect(started.pid).toBe(pty.pid);
    expect(pty.request).toEqual({ ...REQUEST, term: SETTINGS_DEFAULTS.pty.term, cols: SETTINGS_DEFAULTS.pty.cols, rows: SETTINGS_DEFAULTS.pty.rows });
    expect(hold.has(login("agent-a"))).toBe(true);
    expect(hold.count()).toBe(1);
  });

  test("refuses a second PTY for a key it already holds", async () => {
    const { hold } = holder();
    await hold.start("agent-a", REQUEST);
    const refused = await hold.start("agent-a", REQUEST).then(() => null, (error: unknown) => error);
    expect(String(refused)).toContain("a PTY is already held for agent-a");
  });

  test("the snapshot reflects what the program printed", async () => {
    const { hold, provider } = holder();
    await hold.start("agent-a", REQUEST);
    const taken = nextChunk(hold, login("agent-a"));
    provider.last().emit("hello\r\nworld");
    await taken;
    expect(hold.snapshot(login("agent-a"))).toBe("hello\r\nworld");
  });

  test("a subscriber gets each chunk and then the exit", async () => {
    const { hold, provider } = holder();
    await hold.start("agent-a", REQUEST);
    const chunks: string[] = [];
    const exited = new Promise<PtyExit>((resolve) => { hold.subscribe(login("agent-a"), (data) => chunks.push(data), resolve); });
    provider.last().emit("one");
    provider.last().emit("two");
    provider.last().exit({ exitCode: 3, signal: null });
    expect(await exited).toEqual({ exitCode: 3, signal: null });
    expect(chunks).toEqual(["one", "two"]);
    expect(hold.has(login("agent-a"))).toBe(false);
    expect(hold.count()).toBe(0);
  });

  test("an unsubscribed viewer gets nothing more", async () => {
    const { hold, provider } = holder();
    await hold.start("agent-a", REQUEST);
    const chunks: string[] = [];
    const stop = hold.subscribe(login("agent-a"), (data) => chunks.push(data), ignore);
    stop();
    const taken = nextChunk(hold, login("agent-a"));
    provider.last().emit("after");
    await taken;
    expect(chunks).toEqual([]);
  });

  test("write and resize reach the PTY", async () => {
    const { hold, provider } = holder();
    await hold.start("agent-a", REQUEST);
    hold.write(login("agent-a"), "ls\r");
    hold.resize(login("agent-a"), 80, 24);
    expect(provider.last().written).toEqual(["ls\r"]);
    expect(provider.last().sizes).toEqual([{ cols: 80, rows: 24 }]);
  });

  test("the held backend types a submit and keys into the PTY running the handle's pid", async () => {
    const { hold, provider } = holder();
    const { pid } = await hold.start("agent-a", REQUEST);
    bindHeldInput((target, data) => hold.writeToPid(target, data));
    heldBackend.agentInput.submit(String(pid), "/new");
    heldBackend.agentInput.sendKeys(String(pid), ["Escape", "C-c"]);
    expect(provider.last().written).toEqual(["/new", "\r", "\x1b", "\x03"]);
    expect(() => heldBackend.agentInput.submit("999999", "x")).toThrow("no PTY held here runs pid 999999");
  });

  test("kill ends the program and the PTY is no longer held", async () => {
    const { hold, provider } = holder();
    await hold.start("agent-a", REQUEST);
    const exited = new Promise<PtyExit>((resolve) => { hold.subscribe(login("agent-a"), ignore, resolve); });
    hold.kill("agent-a");
    await exited;
    expect(provider.last().killed).toBe(true);
    expect(hold.has(login("agent-a"))).toBe(false);
  });

  test("killAll ends every held PTY", async () => {
    const { hold, provider } = holder();
    await hold.start("agent-a", REQUEST);
    await hold.start("agent-b", REQUEST);
    hold.killAll();
    expect(provider.spawned.every((pty) => pty.killed)).toBe(true);
  });

  test("a key it does not hold is refused", () => {
    const { hold } = holder();
    expect(() => hold.snapshot(login("nobody"))).toThrow("no PTY is held for nobody");
    expect(() => hold.write(login("nobody"), "x")).toThrow("no PTY is held for nobody");
  });
});
