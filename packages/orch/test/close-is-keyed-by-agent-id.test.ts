import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cmdClose } from "../src/commands/lifecycle/close.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { orm } from "../src/store/connection.ts";
import { isRecord } from "../src/util.ts";
import { FakePanedBackend, fakePane, withRegisteredBackendAsync } from "./helpers/backend.ts";
import { seedSpace } from "./helpers/space.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { seedAgent } from "./helpers/agent.ts";
import { endProcess } from "../src/store/interval-rows.ts";
import { servedServices } from "./helpers/daemon-state.ts";
import { captureCommand } from "./helpers/stdout.ts";
import type { RpcServer } from "../src/types/daemon.ts";

/**
 * `orch close --all`, run from a plain shell,
 * asked herdr to close panes named after AGENT IDS:
 *
 *     Could not close 2d6biywurb: herdr pane close 2d6biywurb failed after 4
 *     attempts: {"error":{"code":"pane_not_found",...}}
 *
 * Two facts got welded (Rule 11). Identity is the
 * minted id; the pane handle is ENVIRONMENT, on its own interval timeline, and
 * it is NULL the moment the pane is gone. Close resolved a handle first and
 * used it for everything — the fallback `view.environment.handle ?? address`
 * fabricated a handle out of the identity, and every report line named the
 * plexer's coordinate instead of the agent.
 *
 * A handle has exactly one legitimate use: the argument to `placement.close`.
 * It is never a target key, never a dedupe key, and never what a human or a
 * `--json` consumer is told they closed.
 */

const dirs: OrchDir[] = [];
const servers: RpcServer[] = [];
const oldDir: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR);
const oldKey = process.env[LAUNCH_ENV];
const SETTINGS = {
  enabled: { adapters: ["pi"], backends: ["headless"] },
  defaults: { adapter: "pi", backend: "headless" },
};

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  if (oldDir === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = oldDir;
  if (oldKey === undefined) delete process.env[LAUNCH_ENV]; else process.env[LAUNCH_ENV] = oldKey;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-close-by-id-");
  dirs.push(dir);
  writeSettingsFixture(dir, SETTINGS);
  process.env.ORCH_DIR = dir;
  delete process.env[LAUNCH_ENV];
  orm(dir);
  seedSpace(dir, "space00001");
  return dir;
}

/** `orch close --all` in-process against `backend`, its writes served by orchd on `dir`. */
async function closeAll(dir: OrchDir, backend: FakePanedBackend, args: string[] = ["--json"]): Promise<{ text: string; payload: Record<string, unknown> }> {
  const services = await servedServices({ orchDir: dir, settings: SETTINGS }, servers);
  return captureCommand(() => withRegisteredBackendAsync(backend, () => cmdClose(services, ["--all", ...args])));
}

/** Seed an agent whose process has already ended, so close has nothing to signal.
 *  `handle` absent = the pane is GONE: `agent_handles` has no open interval, which
 *  is exactly the state the reported sweep hit. */
function seedLiveAgent(dir: OrchDir, key: string, handle?: string): void {
  seedAgent(key, {
    adapter: "pi", backend: "headless", space: "space00001",
    ...(handle === undefined ? {} : { handle }),
  }, dir);
  endProcess(dir, key, Date.now());
  const agentDir = join(dir, "agents", key);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, key, agent: "pi", state: "working",
  }));
}

/** The reported conditions: the sweep runs from a plain shell, so orch is NOT
 *  inside the plexer's session and cannot see its pane inventory. */
class OutsideSessionBackend extends FakePanedBackend {
  override isInsideSession(): boolean {
    return false;
  }
}

describe("close is keyed by the agent id, never by a plexer coordinate (U10)", () => {
  test("an agent whose pane is gone is never handed to the plexer as a pane", async () => {
    const dir = fixture();
    seedLiveAgent(dir, "2d6biywurb");
    const backend = new OutsideSessionBackend({ id: "headless", panes: [] });

    await closeAll(dir, backend);

    // The reported failure in one assertion: orch asked `herdr pane close
    // 2d6biywurb`, an agent id in the place a pane handle goes.
    expect(backend.closed).not.toContain("2d6biywurb");
    expect(backend.closed).toEqual([]);
  });

  test("an agent whose pane is gone still ends, and reports done", async () => {
    const dir = fixture();
    seedLiveAgent(dir, "7eh83quhwd");
    const backend = new OutsideSessionBackend({ id: "headless", panes: [] });

    const { payload } = await closeAll(dir, backend);

    const results: unknown[] = Array.isArray(payload.results) ? payload.results : [];
    expect(results.map((row: unknown) => (isRecord(row) ? row.outcome : null))).toEqual(["done"]);
    expect(spawnedRecords(dir).has("7eh83quhwd")).toBe(false);
  });

  test("what a human is told they closed is the agent, not the plexer's coordinate", async () => {
    const dir = fixture();
    seedLiveAgent(dir, "zcixvdjos8", "w7:p3C");
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p3C")] });

    const { text } = await closeAll(dir, backend, []);

    // One listing must speak ONE vocabulary. `Closed w7:p3C.` names a herdr
    // coordinate a person never typed and cannot address anything else with.
    expect(text).toContain("zcixvdjos8");
    expect(text).not.toContain("w7:p3C");
  });

  test("the --json closed list names agents, so a caller can map it back", async () => {
    const dir = fixture();
    seedLiveAgent(dir, "3ng6mmpi8e", "w7:p3D");
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p3D")] });

    const { payload } = await closeAll(dir, backend);

    expect(payload.closed).toEqual(["3ng6mmpi8e"]);
  });

  test("the plexer is still handed the real handle when there IS a pane", async () => {
    const dir = fixture();
    seedLiveAgent(dir, "lwhmatovbh", "w7:p3E");
    const backend = new FakePanedBackend({ id: "headless", panes: [fakePane("w7:p3E")] });

    await closeAll(dir, backend);

    // The handle is not banished — it is the argument to `placement.close` and
    // nothing else.
    expect(backend.closed).toEqual(["w7:p3E"]);
  });
});
