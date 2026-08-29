import { describe, expect, test } from "bun:test";
import type { AnswerRequest, LifecycleVerb, ModelRequest, SteerRequest } from "../src/adapters/adapter.ts";
import { dispatchStrategies, type HarnessStrategies } from "../src/backends/strategies.ts";

describe("composed harness strategies", () => {
  test("one dispatcher passes control request payloads to every strategy", () => {
    const seen: string[] = [];
    const request: SteerRequest = { key: "agent-1", text: "hello", id: "m1" };
    const strategies: HarnessStrategies = {
      steer: { steer: (value: SteerRequest) => { seen.push(`${value.key}:${value.text}`); return undefined; } },
      ask: { answer: (value: AnswerRequest) => { seen.push(`ask:${value.text}`); return undefined; } },
      model: { setModel: (value: ModelRequest) => { seen.push(`model:${value.model}`); return undefined; } },
      lifecycle: { lifecycle: (verb: LifecycleVerb) => { seen.push(`life:${verb}`); return undefined; } },
    };
    dispatchStrategies(strategies, { kind: "steer", request });
    dispatchStrategies(strategies, { kind: "ask", request: { key: "agent-1", text: "yes" } });
    dispatchStrategies(strategies, { kind: "model", request: { key: "agent-1", model: "x", id: "m2" } });
    dispatchStrategies(strategies, { kind: "lifecycle", verb: "reload" });
    expect(seen).toEqual(["agent-1:hello", "ask:yes", "model:x", "life:reload"]);
  });
});
