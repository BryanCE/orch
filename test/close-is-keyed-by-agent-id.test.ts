import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdClose } from "../src/commands/lifecycle.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { orm } from "../src/store/connection.ts";
import { isRecord } from "../src/util.ts";
import { FakePanedBackend, fakePane, withRegisteredBackend } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedAgent } from "./helpers/agent.ts";

/**
 * TASKS/11-usage-bugs.md U10 — `orch close --all`, run from a plain shell,
 * asked herdr to close panes named after AGENT IDS:
 *
 *     Could not close 2d6biywurb: herdr pane close 2d6biywurb failed after 4
 *     attempts: {"error":{"code":"pane_not_found",...}}
 *
 * Two facts got welded (Rule 11, TASKS/01-agent-model.md §2). Identity is the
 * minted id; the pane handle is ENVIRONMENT, on its own interval timeline, and
 * it is NULL the moment the pane is gone. Close resolved a handle first and
 * used it for everything — the fallback `view.environment.handle ?? address`
 * fabricated a handle out of the identity, and every report line named the
 * plexer's coordinate instead of the agent.
 *
 * A handle has exactly one legitimate use: the argument to `paneHost.close`.
 * It is never a target key, never a dedupe key, and never what a human or a
 * `--json` consumer is told they closed.
 */

const dirs: string[] = [];
const oldDir = process.env.ORCH_DIR;
const oldKey = process.env.ORCH_AGENT_KEY;
const originalWrite = process.stdout.write.bind(process.stdout);

afterEach(() => {
  process.stdout.write = originalWrite;
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldKey === undefined) delete process.env.ORCH_AGENT_KEY; else process.env.ORCH_AGENT_KEY = oldKey;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-close-by-id-"));
  dirs.push(dir);
  writeSettingsFixture(dir, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
  process.env.ORCH_DIR = dir;
  delete process.env.ORCH_AGENT_KEY;
  orm(dir);
  seedSpace(dir, "space00001");
  return dir;
}

/** Seed a live agent. `handle` absent = the pane is GONE: `agent_handles` has no
 *  open interval, which is exactly the state the reported sweep hit. */
function seedLiveAgent(dir: string, key: string, handle?: string): void {
  seedAgent(key, {
    adapter: "pi", backend: "headless", space: "space00001",
    ...(handle === undefined ? {} : { handle }),
  });
  const agentDir = join(dir, "agents", key);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key, paneId: handle ?? null, pid: 999_999_99, agent: "pi", state: "working",
  }));
}

/** The reported conditions: the sweep runs from a plain shell, so orch is NOT
 *  inside the plexer's session and cannot see its pane inventory. */
class OutsideSessionBackend extends FakePanedBackend {
  override isInsideSession(): boolean {
    return false;
  }
}

function capture(action: () => void): { text: string; payload: Record<string, unknown> } {
  let output = "";
  process.stdout.write = (chunk: string | Uint8Array) => { output += chunk.toString(); return true; };
  try { action(); } finally {
    process.stdout.write = originalWrite;
    process.exitCode = undefined;
  }
  const last = output.trim().split("\n").at(-1) ?? "{}";
  let payload: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(last);
    if (isRecord(parsed)) payload = parsed;
  } catch { /* a human-readable run prints no JSON */ }
  return { text: output, payload };
}

describe("close is keyed by the agent id, never by a plexer coordinate (U10)", () => {
  test("an agent whose pane is gone is never handed to the plexer as a pane", () => {
    const dir = fixture();
    seedLiveAgent(dir, "2d6biywurb");
    const backend = new OutsideSessionBackend({ id: "headless", panes: [] });

    withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all", "--json"]); }));

    // The reported failure in one assertion: orch asked `herdr pane close
    // 2d6biywurb`, an agent id in the place a pane handle goes.
    expect(backend.closed).not.toContain("2d6biywurb");
    expect(backend.closed).toEqual([]);
  });

  test("an agent whose pane is gone still ends, and reports done", () => {
    const dir = fixture();
    seedLiveAgent(dir, "7eh83quhwd");
    const backend = new OutsideSessionBackend({ id: "headless", panes: [] });

    const { payload } = withRegisteredBackend(backend, () =>
      capture(() => { cmdClose(["--all", "--json"]); }));

    const results: unknown[] = Array.isArray(payload.results) ? payload.results : [];
    expect(results.map((row: unknown) => (isRecord(row) ? row.outcome : null))).toEqual(["done"]);
    expect(spawnedRecords().has("7eh83quhwd")).toBe(false);
  });

  test("what a human is told they closed is the agent, not the plexer's coordinate", () => {
    const dir = fixture();
    seedLiveAgent(dir, "zcixvdjos8", "w7:p3C");
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p3C")] });

    const { text } = withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all"]); }));

    // One listing must speak ONE vocabulary. `Closed w7:p3C.` names a herdr
    // coordinate a person never typed and cannot address anything else with.
    expect(text).toContain("zcixvdjos8");
    expect(text).not.toContain("w7:p3C");
  });

  test("the --json closed list names agents, so a caller can map it back", () => {
    const dir = fixture();
    seedLiveAgent(dir, "3ng6mmpi8e", "w7:p3D");
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p3D")] });

    const { payload } = withRegisteredBackend(backend, () =>
      capture(() => { cmdClose(["--all", "--json"]); }));

    expect(payload.closed).toEqual(["3ng6mmpi8e"]);
  });

  test("the plexer is still handed the real handle when there IS a pane", () => {
    const dir = fixture();
    seedLiveAgent(dir, "lwhmatovbh", "w7:p3E");
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p3E")] });

    withRegisteredBackend(backend, () => capture(() => { cmdClose(["--all", "--json"]); }));

    // The handle is not banished — it is the argument to `paneHost.close` and
    // nothing else.
    expect(backend.closed).toEqual(["w7:p3E"]);
  });
});
