import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordSpawned } from "../src/presence/store.ts";
import { agentView, holderOf } from "../src/store/agent-view.ts";
import { currentLease, leaseHistory } from "../src/store/lease-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";

const tempDirs: string[] = [];
const oldOrchDir = process.env.ORCH_DIR;

function makeOrchDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "orch-ownership-"));
  tempDirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  closeAllStores();
  while (tempDirs.length > 0) removeTempDir(tempDirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

const WORKER = "aaaaaaaaa1";
const ORCH_A = "bbbbbbbbb1";
const ORCH_B = "ccccccccc1";

// A1: ownership is a LEASE on the one agent entity, not a second id space keyed
// by an agent's pane. There is exactly one open holding, and closing it is
// history rather than a deletion.
describe("agent ownership is a lease", () => {
  test("round-trips a holder through the composer, not a second table", () => {
    const dir = makeOrchDir();
    recordSpawned(WORKER, { adapter: "pi", backend: "headless", space: "w1" });

    expect(holderOf(dir, WORKER)).toBeNull();
    expect(agentView(dir, WORKER)?.heldBy).toBeNull();

    recordSpawned(WORKER, { owner: ORCH_A });

    expect(holderOf(dir, WORKER)?.orchId).toBe(ORCH_A);
    expect(agentView(dir, WORKER)?.heldBy?.orchId).toBe(ORCH_A);
  });

  test("an unheld agent is not a dead one — the other three facts stand alone", () => {
    const dir = makeOrchDir();
    recordSpawned(WORKER, { adapter: "pi", backend: "headless", space: "w1", name: "recon-1" });

    const view = agentView(dir, WORKER);
    expect(view).toMatchObject({ id: WORKER, name: "recon-1", harnessId: "pi", heldBy: null, endedAt: null });
    expect(view?.environment).toMatchObject({ plexer: "headless", space: "w1" });
  });

  test("a new holder supersedes the old one and the prior holding stays as history", () => {
    const dir = makeOrchDir();
    recordSpawned(WORKER, { adapter: "pi", backend: "headless", space: "w1" });
    recordSpawned(WORKER, { owner: ORCH_A });
    recordSpawned(WORKER, { owner: ORCH_B });

    expect(currentLease(dir, WORKER)?.orchId).toBe(ORCH_B);
    const history = leaseHistory(dir, WORKER);
    expect(history.map((lease) => lease.orchId)).toEqual([ORCH_A, ORCH_B]);
    expect(history[0]).toMatchObject({ releaseReason: "adopted" });
    expect(history[1]?.until).toBeNull();
  });

  test("re-stamping the holder it already has never re-opens the holding", () => {
    const dir = makeOrchDir();
    recordSpawned(WORKER, { adapter: "pi", backend: "headless", space: "w1", owner: ORCH_A });
    recordSpawned(WORKER, { owner: ORCH_A });

    expect(leaseHistory(dir, WORKER)).toHaveLength(1);
  });

  test("an orchestrator IS an agent — a holder orch has never seen gets a row", () => {
    const dir = makeOrchDir();
    recordSpawned(WORKER, { adapter: "pi", backend: "headless", space: "w1", owner: ORCH_A });

    expect(agentView(dir, ORCH_A)?.id).toBe(ORCH_A);
  });
});
