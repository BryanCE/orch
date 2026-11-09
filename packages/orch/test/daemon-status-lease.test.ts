import { afterEach, describe, expect, test } from "bun:test";

import { leasePayloadFrom } from "../src/daemon/server/fleet-rows.ts";
import { storeLeaseFacts } from "../src/agent/drive-state.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { ensureHarness, insertAgent } from "../src/store/agent-rows.ts";
import { recordProcess } from "../src/store/interval-rows.ts";
import { placeHere } from "../src/process-place.ts";
import { hostIdentity } from "../src/hosts/identity.ts";
import { acquireLease } from "../src/store/lease-rows.ts";
import { processStartToken } from "../src/process-identity.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const dir = tempOrchDir("orch-daemon-status-lease-");
  dirs.push(dir);
  ensureHarness(dir, "pi", "Pi");
  const members: readonly (readonly [string, string])[] = [[WORKER_ID, "Worker"], ["orch", "Lead"]];
  for (const [id, name] of members) {
    insertAgent(dir, { host: hostIdentity(), id, name, spawnedBy: null, harnessId: "pi", cwd: "/tmp", createdAt: 1 });
  }
  recordProcess(dir, placeHere(dir, "orch"), 1, { pid: process.pid, startToken: processStartToken(process.pid) ?? null });
  return dir;
}

/** A1: the agent a lease payload is asked about is named by its minted id — the
 *  old fixture asked with `headless~local~worker`, a key that carried where the
 *  agent sat inside the one fact that identifies it. */
const WORKER_ID = "worker0001";

describe("daemon status lease payload", () => {
  test("reports the current holder and its liveness", () => {
    const dir = fixture();
    acquireLease(dir, WORKER_ID, "orch", 2);
    expect(leasePayloadFrom(WORKER_ID, storeLeaseFacts(dir))).toEqual({
      lease: { holderId: "orch", holderAlive: true },
      leaseKnown: true,
    });
  });

  test("distinguishes a known unleased agent from an unknown key", () => {
    const dir = fixture();
    expect(leasePayloadFrom(WORKER_ID, storeLeaseFacts(dir))).toEqual({ lease: null, leaseKnown: true });
    expect(leasePayloadFrom("missingkey0", storeLeaseFacts(dir))).toEqual({ lease: null, leaseKnown: false });
  });
});
