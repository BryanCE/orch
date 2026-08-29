import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolvePeer } from "../src/agent/peers.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

/**
 * TASKS/02-scope.md L6 — "A slave with no reachable spawner relays through a
 * sibling and burns its turn."
 *
 * Reproduced live: two of four research agents spent their entire turn on
 * `orch_send` to each other and returned relay chatter instead of their report.
 * `ORCH_SPAWNER` was unset, so `target "spawner"` refused, and nothing told
 * them what to do instead — so they improvised, and improvised badly.
 *
 * Two things have to hold. The refusal must SAY what to do (write the result
 * and end the turn), because a bare "no spawner" is exactly the dead end that
 * invites a relay. And the worker header must never instruct a reply orch has
 * not established the worker can deliver.
 */

const dirs: string[] = [];
const ENV = ["ORCH_DIR", "ORCH_SPAWNER", "ORCH_SPAWNER_LABEL", "ORCH_AGENT_KEY"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV.map((name) => [name, process.env[name]]));
  for (const name of ENV) delete process.env[name];
});

afterEach(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): string {
  const d = mkdtempSync(join(tmpdir(), "orch-no-relay-"));
  dirs.push(d);
  process.env.ORCH_DIR = d;
  return d;
}

describe("a worker with no reachable spawner does not relay (L6)", () => {
  test("an unset spawner refuses, and the refusal names the agent's own report path", () => {
    const d = fixture();
    seedStatus(d, "worker0001", { agent: "pi", label: "research-1", pid: process.pid, state: "working" });
    seedStatus(d, "sibling002", { agent: "pi", label: "research-2", pid: process.pid, state: "working" });

    const resolved = resolvePeer("spawner", "worker0001");
    const error = "error" in resolved ? resolved.error : "";

    // This is the exact turn-burning moment. A bare refusal leaves the worker
    // to invent something; it has to be told to write its result and stop.
    expect(error).toContain("no spawner");
    expect(error.toLowerCase()).toContain("result");
    // And it must close the door it left open: relaying is named and refused,
    // rather than left as the obvious thing to try next.
    expect(error).toContain("Do NOT route your report through another agent");
  });

  test("the refusal never suggests another agent as an alternative route", () => {
    const d = fixture();
    seedStatus(d, "worker0001", { agent: "pi", label: "research-1", pid: process.pid, state: "working" });
    seedStatus(d, "sibling002", { agent: "pi", label: "research-2", pid: process.pid, state: "idle" });
    seedStatus(d, "sibling003", { agent: "pi", label: "research-3", pid: process.pid, state: "idle" });

    const resolved = resolvePeer("spawner", "worker0001");
    const error = "error" in resolved ? resolved.error : "";
    // Naming a live peer here is what turned a dead end into a relay chain.
    for (const name of ["research-2", "research-3", "sibling002", "sibling003"]) {
      expect(error).not.toContain(name);
    }
  });

  test("a spawner that is stamped but has no inbox refuses by NAME and still says to report", () => {
    const d = fixture();
    process.env.ORCH_SPAWNER = "deadorch01";
    process.env.ORCH_SPAWNER_LABEL = "claude session";
    seedStatus(d, "worker0001", { agent: "pi", label: "research-1", pid: process.pid, state: "working" });

    const resolved = resolvePeer("spawner", "worker0001");
    const error = "error" in resolved ? resolved.error : "";
    expect(error).toContain("claude session");
    expect(error.toLowerCase()).toContain("result");
  });
});
