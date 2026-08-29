import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { mintAgentId } from "../src/backends/identity.ts";
import { createAgentChannelRole } from "../src/presence/roles.ts";
import { inboxPath } from "../src/presence/inbox.ts";
import { agentView } from "../src/store/agent-view.ts";
import { seedStatus } from "./helpers/presence.ts";
import { seedSpace } from "./helpers/space.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedAgent } from "./helpers/agent.ts";

/**
 * TASKS/02-scope.md B7 — "EVERY agent has an inbox; reading it promptly is the
 * only thing that varies."
 *
 * Rule 11 states the same thing from the other side: delivery and read are
 * ORCH's mechanism and a pane is an OPTIMISATION. `inbox.jsonl → bridge →
 * ack.jsonl` needs no screen, so a capless environment is one with no shortcut,
 * never one orch cannot talk to. A delivery path that consults the plexer or the
 * handle has made a pane a precondition instead of a shortcut.
 */

const dirs: string[] = [];
const saved = process.env.ORCH_DIR;

afterEach(() => {
  closeAllStores();
  if (saved === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = saved;
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function storeDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-inbox-"));
  dirs.push(directory);
  process.env.ORCH_DIR = directory;
  openStore(directory);
  return directory;
}

/** One agent, placed exactly as far as the caller asks and no further. */
function agent(directory: string, facts: Record<string, unknown>): string {
  const id = mintAgentId();
  seedAgent(id, { adapter: "pi", ...facts });
  seedStatus(directory, id, { key: id, agent: "pi", pid: process.pid, state: "idle" });
  return id;
}

function deliveredTo(directory: string, id: string): Record<string, unknown>[] {
  const path = inboxPath(join(directory, "agents", id));
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").trim().split("\n").filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("every agent has an inbox", () => {
  test("a paned agent and a capless one are delivered to identically", () => {
    const directory = storeDir();
    seedSpace(directory, "server");
    const paned = agent(directory, { backend: "tmux", handle: "%5", space: "server" });
    const capless = agent(directory, { space: "server" });

    // The capless agent has NO plexer and NO handle — there is no screen to
    // steer, and that is the whole difference.
    expect(agentView(directory, capless)?.environment.plexer).toBeNull();
    expect(agentView(directory, capless)?.environment.handle).toBeNull();

    const channel = createAgentChannelRole(directory);
    const toPaned = channel.deliver(paned, { text: "go" });
    const toCapless = channel.deliver(capless, { text: "go" });

    expect(toPaned.accepted).toBe(true);
    expect(toCapless.accepted).toBe(true);
    expect(deliveredTo(directory, paned).map((line) => line.text)).toEqual(["go"]);
    expect(deliveredTo(directory, capless).map((line) => line.text)).toEqual(["go"]);
  });

  test("the inbox is at one derived path, whatever the agent's environment", () => {
    const directory = storeDir();
    const headless = agent(directory, { backend: "headless" });
    const paned = agent(directory, { backend: "herdr", handle: "wF:p1" });

    // Same filename, same place, derived from the agent id alone — the address
    // orch delivers to carries no plexer coordinate (Rule 11).
    for (const id of [headless, paned]) {
      expect(inboxPath(join(directory, "agents", id))).toBe(join(directory, "agents", id, "inbox.jsonl"));
    }
  });

  test("delivery stamps an id and a timestamp on every message, for every agent", () => {
    const directory = storeDir();
    const capless = agent(directory, {});
    const receipt = createAgentChannelRole(directory).deliver(capless, { text: "hello" });

    const [line] = deliveredTo(directory, capless);
    expect(line?.id).toBe(receipt.id);
    expect(typeof line?.ts).toBe("string");
  });

  test("delivery is refused for a disconnected bridge, not for a missing pane", () => {
    const directory = storeDir();
    const channel = createAgentChannelRole(directory);

    // No pane: fine, that is a missing shortcut.
    const capless = agent(directory, {});
    expect(channel.deliver(capless, { text: "go" }).accepted).toBe(true);

    // No live bridge: THAT is what makes an agent unreachable, and the refusal
    // names it rather than blaming the environment.
    const dead = mintAgentId();
    seedAgent(dead, { adapter: "pi" });
    seedStatus(directory, dead, { key: dead, agent: "pi", pid: 999_999_99, state: "idle" });
    expect(() => channel.deliver(dead, { text: "go" })).toThrow(/bridge is disconnected/);
  });
});
