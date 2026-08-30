import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdRename } from "../src/commands/lifecycle.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { agentView } from "../src/store/agent-view.ts";
import { orm } from "../src/store/connection.ts";
import { isRecord } from "../src/util.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { AgentNamingRole, PaneNamingRole } from "../src/types/backend.ts";
import { seedAgent } from "./helpers/agent.ts";

/**
 * TASKS/11-usage-bugs.md U5 — `orch rename` set the NAME and left the pane
 * border reading the OLD one, because a SEPARATE `--pane` invocation set the
 * border. Syncing the two required running the command twice.
 *
 * The operator watches the panes. With 8 panes across 2 tabs, if the border is
 * the stale name then the one artifact they actually look at is the one that is
 * wrong — which is the exact failure `skills/orch/SKILL.md` names ("a stale name
 * is worse than an ordinal because it actively lies").
 *
 * This is two names for one fact. `TASKS/01-agent-model.md`: a name is ONE piece
 * of mutable display metadata on an agent, and Rule 9 forbids two mechanisms for
 * one fact. `TASKS/07-port-seam.md` already specified the shape: orch's own name
 * write succeeds or fails on its own, the plexer chrome follows, and "the
 * response states the two outcomes separately".
 *
 * `--pane` survives for the rare case of giving the border something DIFFERENT
 * on purpose — never as the price of a correct display.
 */

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;
const originalWrite = process.stdout.write.bind(process.stdout);

afterEach(() => {
  process.stdout.write = originalWrite;
  // Restore to UNTOUCHED, not 0: other suites assert `process.exitCode` is
  // undefined to prove they never set one, and 0 is a value.
  process.exitCode = undefined;
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

const KEY = "renameagt1";

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-rename-border-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  orm(dir);
  seedSpace(dir, "space00001");
  seedAgent(KEY, { adapter: "pi", backend: "headless", space: "space00001", handle: "w7:p2J", name: "wave2-1" });
  const agentDir = join(dir, "agents", KEY);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key: KEY, paneId: "w7:p2J", pid: process.pid, agent: "pi", state: "idle",
  }));
  return dir;
}

/** A plexer that records what it was asked to relabel, agent and pane apart. */
class NamingBackend extends FakePanedBackend {
  readonly agentNames: string[] = [];
  readonly paneNames: string[] = [];
  override readonly agentNaming: AgentNamingRole;
  override readonly paneNaming: PaneNamingRole;

  constructor(paneFails = false) {
    super({ id: "headless", panes: [fakePane("w7:p2J")] });
    this.agentNaming = { renameAgent: (_handle, name: string): void => { this.agentNames.push(name); } };
    this.paneNaming = {
      renamePane: (_handle, name: string): void => {
        if (paneFails) throw new Error("herdr refused: pane rename unavailable");
        this.paneNames.push(name);
      },
    };
  }
}

function capture(action: () => void): Record<string, unknown> {
  let output = "";
  process.stdout.write = (chunk: string | Uint8Array) => { output += chunk.toString(); return true; };
  try { action(); } finally { process.stdout.write = originalWrite; }
  const parsed: unknown = JSON.parse(output.trim().split("\n").at(-1) ?? "{}");
  if (!isRecord(parsed)) throw new Error(`expected a JSON object, got ${output}`);
  return parsed;
}

describe("orch rename syncs the pane border in one command (U5)", () => {
  test("one rename sets orch's name AND the plexer chrome", () => {
    const dir = fixture();
    const backend = new NamingBackend();

    withRegisteredBackend(backend, () => { capture(() => { cmdRename([KEY, "thinking-axis", "--json"]); }); });

    expect(agentView(dir, KEY)?.name).toBe("thinking-axis");
    expect(backend.agentNames).toEqual(["thinking-axis"]);
    // The BORDER is what the operator looks at. Leaving it stale is the bug.
    expect(backend.paneNames).toEqual(["thinking-axis"]);
  });

  test("the response states the two outcomes SEPARATELY", () => {
    fixture();
    const backend = new NamingBackend();

    const payload = withRegisteredBackend(backend, () =>
      capture(() => { cmdRename([KEY, "thinking-axis", "--json"]); }));

    // 07-port-seam: orch's own write and the plexer chrome are different
    // outcomes, and a caller must be able to tell which one happened.
    expect(payload).toMatchObject({ key: KEY, name: "thinking-axis", renamed: true, chrome: "renamed" });
  });

  test("a plexer that refuses the chrome never unwrites orch's own name", () => {
    const dir = fixture();
    const backend = new NamingBackend(true);

    const payload = withRegisteredBackend(backend, () =>
      capture(() => { cmdRename([KEY, "thinking-axis", "--json"]); }));

    // orch's registry owns the name. The chrome is a separate action whose
    // failure is REPORTED and never rewrites whether the rename happened.
    expect(agentView(dir, KEY)?.name).toBe("thinking-axis");
    expect(payload).toMatchObject({ renamed: true, chrome: "failed" });
    expect(String(payload.chromeError)).toContain("herdr refused");
  });

  test("--pane still gives the border something DIFFERENT, and leaves the name alone", () => {
    const dir = fixture();
    const backend = new NamingBackend();

    withRegisteredBackend(backend, () => { capture(() => { cmdRename([KEY, "just-the-border", "--pane", "--json"]); }); });

    expect(backend.paneNames).toEqual(["just-the-border"]);
    expect(agentView(dir, KEY)?.name).toBe("wave2-1");
    expect(backend.agentNames).toEqual([]);
  });
});
