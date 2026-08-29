import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildEntities } from "../src/entities.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { openStore } from "../src/store/connection.ts";
import { ensureHarness, ensurePlexer, insertAgent } from "../src/store/agent-rows.ts";
import { setHandle } from "../src/store/interval-rows.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * TASKS/11-usage-bugs.md U1 (and U4, which shares its root cause) — orch
 * confidently vouched for panes the plexer no longer had.
 *
 * Four agents listed with a pane id and `alive=True` while herdr answered
 * `pane_not_found` for every one of them. `orch dispatch` accepted the target
 * and then reported an unexplained non-acknowledgement; `orch peek` crashed with
 * a raw herdr error and a stack trace.
 *
 * **A row is not evidence that a pane exists.** `TASKS/07-port-seam.md`: the
 * ENVIRONMENT says whether a pane is there, and the plexer's inventory is that
 * answer. A recorded handle the plexer does not list is a handle orch no longer
 * has, and orch must say so rather than hand it to a pane operation.
 *
 * The agent itself is NOT gone (Rule 11: a pane is an optimisation, work
 * survives losing one). It is an agent with no shortcut — reachable through the
 * inbox, and answered with an absence by anything that needs a screen (E14).
 */

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;

afterEach(() => {
  if (oldDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldDir;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-row-not-pane-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  openStore(dir);
  return dir;
}

/** An agent orch spawned into a plexer pane, recorded exactly as spawn records it. */
function seedAgentInPane(dir: string, id: string, handle: string): void {
  ensureHarness(dir, "pi", "pi", 1);
  ensurePlexer(dir, "headless", "headless");
  insertAgent(dir, { id, harnessId: "pi", cwd: "/work", name: id, createdAt: 1 });
  openStore(dir).query("INSERT INTO agent_plexers (agent_id, plexer_id) VALUES (?, ?)").run(id, "headless");
  setHandle(dir, id, 10, handle);
}

/** A live presence record, so the failure cannot be blamed on a dead process. */
function seedLivePresence(dir: string, id: string, paneId: string): void {
  const directory = join(dir, "agents", id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key: id, pid: process.pid, agent: "pi", state: "idle", paneId,
  }));
}

function entityFor(id: string, panes: readonly ReturnType<typeof fakePane>[]) {
  const backend = new FakePanedBackend({ id: "headless", panes });
  return withRegisteredBackend(backend, () => buildEntities().find((entity) => entity.key === id));
}

describe("a row is not evidence that a pane exists (U1, U4)", () => {
  test("a recorded handle the plexer does not list is reported as NO pane", () => {
    const dir = fixture();
    seedAgentInPane(dir, "goneagent1", "w7:p2B");
    seedLivePresence(dir, "goneagent1", "w7:p2B");

    // The plexer is asked and lists a different pane entirely: the recorded one
    // is gone. This is the exact herdr `pane_not_found` case.
    const entity = entityFor("goneagent1", [fakePane("w7:p9Z")]);

    expect(entity?.paneId).toBeNull();
  });

  test("the agent itself is still there — losing a pane costs a shortcut, not a life", () => {
    const dir = fixture();
    seedAgentInPane(dir, "goneagent1", "w7:p2B");
    seedLivePresence(dir, "goneagent1", "w7:p2B");

    const entity = entityFor("goneagent1", [fakePane("w7:p9Z")]);

    // Rule 11: a pane is an optimisation and work survives losing one. The agent
    // is still orch's, still listed, still addressable through its inbox.
    expect(entity).toBeDefined();
    expect(entity?.managed).toBe(true);
    expect(entity?.presence?.alive).toBe(true);
  });

  test("a handle the plexer DOES list is kept", () => {
    const dir = fixture();
    seedAgentInPane(dir, "liveagent1", "w7:p2B");
    seedLivePresence(dir, "liveagent1", "w7:p2B");

    const entity = entityFor("liveagent1", [fakePane("w7:p2B")]);

    expect(entity?.paneId).toBe("w7:p2B");
  });
});
