import { afterAll, describe, expect, test } from "bun:test";
import { mintAgentId } from "../src/backends/identity.ts";
import { heldCapacity, forgetCapacity } from "../src/daemon/server/capacity.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { seedAgent, seedLiveProcess, seedOrch } from "./helpers/agent.ts";
import { testServices } from "./helpers/services.ts";
import { tempOrchDir } from "./helpers/tempdir.ts";

afterAll(() => closeAllStores());

describe("orchd holds the fleet capacity", () => {
  test("serves the held value until a view changes, then recomputes", () => {
    const orchDir = tempOrchDir("orch-capacity-hold-");
    const settings = testServices({ orchDir, settings: {} }).settings.current();
    const root = mintAgentId();
    seedOrch(orchDir, root);
    const first = heldCapacity(orchDir, settings);
    expect(heldCapacity(orchDir, settings)).toBe(first);
    const worker = mintAgentId();
    seedAgent(worker, { spawnedBy: root }, orchDir);
    seedLiveProcess(orchDir, worker);
    const second = heldCapacity(orchDir, settings);
    expect(second).not.toBe(first);
    expect(second.total.used).toBe(first.total.used + 1);
  });

  test("forgetCapacity drops the held value", () => {
    const orchDir = tempOrchDir("orch-capacity-forget-");
    const settings = testServices({ orchDir, settings: {} }).settings.current();
    const first = heldCapacity(orchDir, settings);
    forgetCapacity(orchDir);
    expect(heldCapacity(orchDir, settings)).not.toBe(first);
  });
});
