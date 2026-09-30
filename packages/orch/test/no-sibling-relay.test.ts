import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resolvePeer } from "../src/agent/peers.ts";
import { askFrom, stubDaemonLink } from "./helpers/daemon-client.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";
import { tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

/**
 * A slave with no reachable spawner relays through a sibling and burns its turn.
 *
 * Reproduced live: two of four research agents spent their entire turn on
 * `orch_send` to each other and returned relay chatter instead of their report.
 * orch had no spawner provenance, so `target "spawner"` refused, and nothing told
 * them what to do instead — so they improvised, and improvised badly.
 *
 * Two things have to hold. The refusal must SAY what to do (write the result
 * and end the turn), because a bare "no spawner" is exactly the dead end that
 * invites a relay. And the worker header must never instruct a reply orch has
 * not established the worker can deliver.
 */

const dirs: OrchDir[] = [];

beforeEach(() => {
  isolateOrchEnv();
});

afterEach(() => {
  restoreOrchEnv();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function fixture(): OrchDir {
  const d = tempOrchDir("orch-no-relay-");
  dirs.push(d);
  process.env.ORCH_DIR = d;
  return d;
}

describe("a worker with no reachable spawner does not relay (L6)", () => {
  test("an unset spawner refuses, and the refusal names the agent's own report path", async () => {
    const d = fixture();
    seedStatus(d, "worker0001", { agent: "pi", label: "research-1", pid: process.pid, state: "working" });
    seedStatus(d, "sibling002", { agent: "pi", label: "research-2", pid: process.pid, state: "working" });

    const resolved = await resolvePeer(d, stubDaemonLink(), "spawner", "worker0001");
    const error = "error" in resolved ? resolved.error : "";

    // This is the exact turn-burning moment. A bare refusal leaves the worker
    // to invent something; it has to be told to write its result and stop.
    expect(error).toContain("no spawner");
    expect(error.toLowerCase()).toContain("result");
    // The unavailable tool is not offered, so the refusal does not need to
    // suggest or forbid sibling relays.
    expect(error).not.toContain("Do NOT route your report through another agent");
  });

  test("the refusal never suggests another agent as an alternative route", async () => {
    const d = fixture();
    seedStatus(d, "worker0001", { agent: "pi", label: "research-1", pid: process.pid, state: "working" });
    seedStatus(d, "sibling002", { agent: "pi", label: "research-2", pid: process.pid, state: "idle" });
    seedStatus(d, "sibling003", { agent: "pi", label: "research-3", pid: process.pid, state: "idle" });

    const resolved = await resolvePeer(d, stubDaemonLink(), "spawner", "worker0001");
    const error = "error" in resolved ? resolved.error : "";
    // Naming a live peer here is what turned a dead end into a relay chain.
    for (const name of ["research-2", "research-3", "sibling002", "sibling003"]) {
      expect(error).not.toContain(name);
    }
  });

  test("a spawner recorded by orch but with no live status refuses by NAME and still says to report", async () => {
    const d = fixture();
    seedStatus(d, "worker0001", { agent: "pi", label: "research-1", pid: process.pid, state: "working" });
    const daemon = stubDaemonLink();
    daemon.ask = askFrom({
      self: () => ({
        id: "worker0001", kind: "agent", space: null, depth: 1,
        view: {
          id: "worker0001", name: "worker", label: null, harnessId: "pi", cwd: "/w", createdAt: 1,
          spawnedBy: "deadorch01", spawnedByName: "claude session", rootAgentId: "deadorch01", heldBy: null,
          environment: { plexer: null, handle: null, space: null, worktree: null, branch: null },
          tuning: { model: null, thinking: null }, endedAt: null,
        },
      }),
    });

    const resolved = await resolvePeer(d, daemon, "spawner", "worker0001");
    const error = "error" in resolved ? resolved.error : "";
    expect(error).toContain("claude session");
    expect(error.toLowerCase()).toContain("result");
  });
});
