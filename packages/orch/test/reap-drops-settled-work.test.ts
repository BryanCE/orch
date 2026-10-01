import type { OrchDir } from "../src/types/core.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { closeAllStores } from "../src/store/connection.ts";
import { agentView } from "../src/store/agent-view.ts";
import { reapDeadAgentRecords } from "../src/presence/store.ts";
import { enqueueTask, insertAttempt, insertCancellation, settleAttempt } from "../src/store/task-rows.ts";
import { listTasks } from "../src/queue.ts";
import type { GrantAction } from "../src/types/store.ts";
import { approveGrantRequest, grantIsApproved, recordGrantRequest, spendGrant } from "../src/store/grant-rows.ts";
import { ensureHost } from "../src/store/agent-rows.ts";
import { hostOs } from "../src/host.ts";
import { seedLiveProcess, seedOrch } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

/** The store holds running state only. A dead agent's settled work is history,
 *  so it never pins the agent's row; work still in flight does. */

const dirs: OrchDir[] = [];
afterEach(() => { closeAllStores(); while (dirs.length) removeTempDir(dirs.pop()!); });

function fixture(): OrchDir {
  const d = tempOrchDir("orch-reap-settled-");
  dirs.push(d);
  seedOrch(d, "boss");
  seedOrch(d, "worker");
  return d;
}

function action(command: string): GrantAction {
  return { kind: "command.run", params: { command } };
}

describe("reap drops a dead agent's settled work", () => {
  test("settled tasks it enqueued, ran or cancelled no longer pin it", () => {
    const d = fixture();
    seedLiveProcess(d, "boss");
    enqueueTask(d, { id: "ran", text: "t", opts: {}, enqueuedBy: "boss", scopeAgentId: "worker" });
    insertAttempt(d, "ran", "worker", "dispatch-1", 1);
    settleAttempt(d, "ran", 1, 2, "done");
    enqueueTask(d, { id: "dropped", text: "t", opts: {}, enqueuedBy: "worker", scopePackId: "boss" });
    insertCancellation(d, "dropped", "worker");

    expect(reapDeadAgentRecords(d)).toEqual(["worker"]);
    expect(agentView(d, "worker")).toBeNull();
    expect(listTasks(d).map((task) => task.id)).toEqual([]);
  });

  test("a queued task keeps its dead enqueuer until it settles", () => {
    const d = fixture();
    seedLiveProcess(d, "boss");
    enqueueTask(d, { id: "waiting", text: "t", opts: {}, enqueuedBy: "worker", scopePackId: "boss" });

    expect(reapDeadAgentRecords(d)).toEqual([]);
    expect(agentView(d, "worker")).not.toBeNull();
    expect(listTasks(d).map((task) => task.id)).toEqual(["waiting"]);
  });

  test("spent and pending grants go; an approval still spendable stays", () => {
    const d = fixture();
    seedLiveProcess(d, "boss");
    ensureHost(d, "host", "host", hostOs(), Date.now());
    const spent = recordGrantRequest(d, action("spent"), "worker");
    approveGrantRequest(d, spent.id, "host");
    spendGrant(d, action("spent"), "worker");
    recordGrantRequest(d, action("pending"), "worker");
    expect(reapDeadAgentRecords(d)).toEqual(["worker"]);

    seedOrch(d, "asker");
    const open = recordGrantRequest(d, action("open"), "asker");
    approveGrantRequest(d, open.id, "host");
    expect(reapDeadAgentRecords(d)).toEqual([]);
    expect(grantIsApproved(d, action("open"))).toBe(true);
  });
});
