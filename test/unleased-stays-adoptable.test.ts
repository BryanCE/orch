import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { insertAgent } from "../src/store/agent-rows.ts";
import { adoptLease, currentLease } from "../src/store/lease-rows.ts";
import { agentView, liveAgentViews } from "../src/store/agent-view.ts";
import { sweepExpiredRows } from "../src/daemon/retention.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { OrchConfig } from "../src/types/config.ts";

/**
 * TASKS/02-scope.md D3 — "Unleased + idle stays alive and adoptable,
 * indefinitely. Nothing ages it out."
 *
 * TASKS/01-agent-model.md:388 — "Unleased and idle, it stays alive and
 * adoptable. It costs a pane and some memory, not tokens." An unleased agent is
 * the NORMAL resting state after its orch died (D2), not a defect to tidy away.
 * The temptation is a sweep, and the sweep is exactly what this row forbids:
 * age is not a fact about whether work is wanted.
 */

const dirs: string[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), "orch-unleased-adoptable-"));
  dirs.push(d);
  const db = openStore(d);
  db.query("INSERT INTO harnesses(id,name) VALUES (?,?)").run("pi", "Pi");
  insertAgent(d, { id: "loose", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "loose", createdAt: 1 });
  insertAgent(d, { id: "adopter", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "adopter", createdAt: 2 });
  return d;
}

/** Every retention window at its shortest, so nothing survives by luck. */
function aggressiveRetention(): OrchConfig {
  return {
    retention: { ended_agents_days: 0, queue_days: 0, events_days: 0, runs_days: 0, outbox_days: 0, logs_days: 0 },
    queue: { max_retries: 1 },
  } as OrchConfig;
}

/** Far enough ahead that any age-based rule would have fired many times over. */
const FAR_FUTURE = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);

describe("unleased and idle stays alive and adoptable (D3)", () => {
  test("a decade of retention sweeps never ages out an unleased idle agent", () => {
    const d = fixture();
    seedStatus(d, "loose", { agent: "pi", pid: process.pid, state: "idle" });
    expect(currentLease(d, "loose")).toBeNull();

    sweepExpiredRows(d, aggressiveRetention(), FAR_FUTURE);

    // Nothing ages it out: no ending was written, and it is still live.
    expect(agentView(d, "loose")?.endedAt).toBeNull();
    expect(liveAgentViews(d).map((v) => v.id)).toContain("loose");
  });

  test("and it is still adoptable afterwards — the point of keeping it", () => {
    const d = fixture();
    seedStatus(d, "loose", { agent: "pi", pid: process.pid, state: "idle" });
    sweepExpiredRows(d, aggressiveRetention(), FAR_FUTURE);

    // "Adoptable" is a claim about what an orch can still DO with it, not just
    // about a surviving row. A swept-but-broken agent would fail here.
    adoptLease(d, "loose", "adopter", 100);
    expect(agentView(d, "loose")?.heldBy).toEqual({ orchId: "adopter", since: 100 });
  });

  test("the sweep reaps only agents that actually ENDED, never merely unleased ones", () => {
    const d = fixture();
    insertAgent(d, { id: "ended", spawnedBy: null, harnessId: "pi", cwd: "/repo", name: "ended", createdAt: 3 });
    openStore(d).query("INSERT INTO agent_endings (agent_id, ended_at, closed_by) VALUES (?,?,?)").run("ended", 10, null);

    sweepExpiredRows(d, aggressiveRetention(), FAR_FUTURE);

    // An ending is the ONE thing that makes a record sweepable. The ended agent
    // is gone; the unleased one, swept in the same pass with the same window, is
    // untouched — so the sweep is keyed on the ending and never on age or lease.
    expect(agentView(d, "ended")).toBeNull();
    expect(agentView(d, "loose")?.endedAt).toBeNull();
    expect(liveAgentViews(d).map((v) => v.id)).toContain("loose");
  });

  test("repeated sweeps are stable: an unleased agent survives every one of them", () => {
    const d = fixture();
    seedStatus(d, "loose", { agent: "pi", pid: process.pid, state: "idle" });
    for (let i = 0; i < 5; i += 1) sweepExpiredRows(d, aggressiveRetention(), FAR_FUTURE);
    expect(liveAgentViews(d).map((v) => v.id)).toContain("loose");
    expect(currentLease(d, "loose")).toBeNull();
  });
});
