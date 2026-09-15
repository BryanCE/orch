import type { ResultOf } from "../../src/daemon/client/protocol.ts";
import type { RpcHandlers } from "../../src/types/daemon.ts";

/** Every handler present; the ones a test does not override throw. */
export function stubRpcHandlers(overrides: Partial<RpcHandlers> = {}): RpcHandlers {
  const notStubbed = (): never => { throw new Error("rpc handler not stubbed"); };
  return {
    "daemon-status": notStubbed,
    "subscribe-events": notStubbed,
    "environment-labels": notStubbed,
    "peer-view": notStubbed,
    notify: notStubbed,
    status: notStubbed,
    attach: notStubbed,
    dispatch: notStubbed,
    steer: notStubbed,
    message: notStubbed,
    answer: notStubbed,
    "set-model": notStubbed,
    lifecycle: notStubbed,
    "spawn-headless": notStubbed,
    "agent-closed": notStubbed,
    question: notStubbed,
    questions: notStubbed,
    ack: notStubbed,
    "report-status": notStubbed,
    "report-result": notStubbed,
    enqueue: notStubbed,
    "control-outcome": notStubbed,
    reload: notStubbed,
    ...overrides,
  };
}

export function daemonStatusFixture(overrides: Partial<ResultOf<"daemon-status">> = {}): ResultOf<"daemon-status"> {
  return {
    pid: 1,
    startedAt: "2020-01-01T00:00:00.000Z",
    uptimeSec: 0,
    codeHash: "test",
    socket: "test.sock",
    subsystems: { workLoop: "running", livenessTick: "running", settingsWatch: "running" },
    ...overrides,
  };
}
