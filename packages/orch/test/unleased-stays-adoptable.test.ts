import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores, orm } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { adoptLease, currentLease } from "../src/store/lease-rows.ts";
import { agentView, liveAgentViews } from "../src/store/agent-view.ts";
import { sweepExpiredRows } from "../src/daemon/server/retention.ts";
import { reapDeadAgentRecords } from "../src/presence/store.ts";
import { seedLiveProcess } from "./helpers/agent.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchSettings } from "../src/types/settings.ts";
import { sql } from "drizzle-orm";

import type { OrchDir } from "../src/types/core.ts";
/**
 * Unleased + idle stays alive and adoptable, indefinitely. Nothing ages it out.
 *
 * Unleased and idle, it stays alive and adoptable. It costs a pane and some
 * memory, not tokens. An unleased agent is
 * the NORMAL resting state after its orch died (D2), not a defect to tidy away.
 * The temptation is a sweep, and the sweep is exactly what this row forbids:
 * age is not a fact about whether work is wanted. Two sweeps run in the daemon,
 * the retention sweep and the liveness tick's reap, and neither may take it.
 */

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const d = tempOrchDir("orch-unleased-adoptable-");
  dirs.push(d);
  const db = orm(d);
  db.run(sql`INSERT INTO harnesses(id,name) VALUES (${"pi"},${"Pi"})`);
  insertAgent(d, { id: "loose", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "loose", createdAt: 1 });
  insertAgent(d, { id: "adopter", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "adopter", createdAt: 2 });
  // Both run: the loose agent rests, the adopter is an orch waiting to take it.
  seedLiveProcess(d, "loose");
  seedLiveProcess(d, "adopter");
  seedStatus(d, "loose", { agent: "pi", pid: process.pid, state: "idle" });
  return d;
}

/** Every retention window at its shortest, so nothing survives by luck. The fixture
 *  is COMPLETE for what it is typed as: `sweepExpiredRows` takes the retention
 *  section, so that section is the whole value and there is nothing to cast past. */
function aggressiveRetention(): Pick<OrchSettings, "retention"> {
  return {
    retention: { ended_agents_days: 0, queue_days: 0, events_days: 0, runs_days: 0, outbox_days: 0, control_outcomes_days: 0, logs_days: 0 },
  };
}

/** Far enough ahead that any age-based rule would have fired many times over. */
const FAR_FUTURE = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);

/** One daemon pass: the retention sweep and the liveness tick's reap. */
function sweep(d: OrchDir): string[] {
  sweepExpiredRows(d, aggressiveRetention(), FAR_FUTURE);
  return reapDeadAgentRecords(d);
}

describe("unleased and idle stays alive and adoptable (D3)", () => {
  test("a decade of sweeps never ages out an unleased idle agent", () => {
    const d = fixture();
    expect(currentLease(d, "loose")).toBeNull();

    expect(sweep(d)).toEqual([]);

    // Nothing ages it out: its process runs, so it is still live.
    expect(agentView(d, "loose")?.endedAt).toBeNull();
    expect(liveAgentViews(d).map((v) => v.id)).toContain("loose");
  });

  test("and it is still adoptable afterwards — the point of keeping it", () => {
    const d = fixture();
    sweep(d);

    // "Adoptable" is a claim about what an orch can still DO with it, not just
    // about a surviving row. A swept-but-broken agent would fail here.
    adoptLease(d, "loose", "adopter", 100);
    expect(agentView(d, "loose")?.heldBy).toEqual({ orchId: "adopter", since: 100 });
  });

  test("the reap takes only agents whose process is GONE, never merely unleased ones", () => {
    const d = fixture();
    insertAgent(d, { id: "ended", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "ended", createdAt: 3 });
    orm(d).run(sql`INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (${"ended"},${10},${null})`);

    // A gone process is the ONE thing that makes a record reapable. The ended
    // agent is gone; the unleased one, swept in the same pass, is untouched —
    // so the reap is keyed on liveness and never on age or lease.
    expect(sweep(d)).toEqual(["ended"]);
    expect(agentView(d, "ended")).toBeNull();
    expect(agentView(d, "loose")?.endedAt).toBeNull();
    expect(liveAgentViews(d).map((v) => v.id)).toContain("loose");
  });

  test("repeated sweeps are stable: an unleased agent survives every one of them", () => {
    const d = fixture();
    for (let i = 0; i < 5; i += 1) expect(sweep(d)).toEqual([]);
    expect(liveAgentViews(d).map((v) => v.id)).toContain("loose");
    expect(currentLease(d, "loose")).toBeNull();
  });
});
