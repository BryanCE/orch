import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { stampGovernance } from "../src/daemon/server/governance.ts";
import { orchDirAt } from "../src/services.ts";
import type { CallerCredential, OrchDir } from "../src/types/core.ts";
import type { Governance } from "../src/daemon/client/protocol.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { seedOrch } from "./helpers/agent.ts";
import { idleDaemonState } from "./helpers/daemon-state.ts";
import { testServices } from "./helpers/services.ts";

function fixture(): { root: OrchDir; state: ReturnType<typeof idleDaemonState> } {
  const value = process.env.ORCH_DIR;
  if (value === undefined) throw new Error("ORCH_DIR is required");
  const root = orchDirAt(value);
  const services = testServices({ orchDir: root, settings: null });
  return { root, state: idleDaemonState(services, root) };
}

beforeEach(() => isolateOrchEnv());
afterEach(() => restoreOrchEnv());

describe("stampGovernance", () => {
  test("returns the same params when caller is absent", () => {
    const { state } = fixture();
    const params = { steal: false };
    expect(stampGovernance(state, params)).toBe(params);
  });

  test("stamps a launch credential as an operator", () => {
    const { root, state } = fixture();
    const id = "seeded-orchestrator";
    seedOrch(root, id);
    const caller: CallerCredential = {
      launch: id,
      session: null,
      process: { pid: 1, startToken: null },
    };
    const params: Governance = { caller };
    const stamped = stampGovernance(state, params);
    expect(stamped.actor).toBe(id);
    expect(stamped.actorIsOperator).toBe(true);
  });

  test("drops a forged actor when the caller resolves to nobody", () => {
    const { state } = fixture();
    const caller: CallerCredential = {
      launch: null,
      session: null,
      process: { pid: 1, startToken: null },
    };
    const params: Governance = { caller, actor: "x" };
    const stamped = stampGovernance(state, params);
    expect("actor" in stamped).toBe(false);
  });

  test("rejects steal from a driving session", () => {
    const { state } = fixture();
    const caller: CallerCredential = {
      launch: null,
      session: { harnessId: "claude", sessionId: "tok", pid: 1 },
      process: { pid: 1, startToken: null },
    };
    expect(() => stampGovernance(state, { caller, steal: true })).toThrow(/operator-only/);
  });
});
