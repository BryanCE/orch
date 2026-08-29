import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn.ts";
import { parseIdentity, normalizeControlTarget } from "../src/backends/identity.ts";
import { spawnedRecords } from "../src/presence/store.ts";
import { agentById } from "../src/store/agent-rows.ts";
import { piAdapter } from "../src/adapters/pi.ts";
import type { Backend } from "../src/backends/backend.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const oldOrchDir = process.env.ORCH_DIR;
const dirs: string[] = [];

function tempOrchDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-spawn-identity-"));
  dirs.push(dir);
  process.env.ORCH_DIR = dir;
  return dir;
}

afterEach(() => {
  while (dirs.length) removeTempDir(dirs.pop()!);
  if (oldOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = oldOrchDir;
});

// A fake pane backend that records the key it would stamp as ORCH_AGENT_KEY
// (real herdr/tmux put opts.key into the launch env verbatim) and returns a
// pane-native handle distinct from that key.
function fakePaneBackend(paneHandle: string): { backend: Backend; envKey: () => string | undefined } {
  let seen: string | undefined;
  const backend = {
    id: "herdr",
    spawn(_adapter: unknown, opts: { key?: string }) {
      seen = opts.key;
      return paneHandle;
    },
  } as unknown as Backend;
  return { backend, envKey: () => seen };
}

describe("one key per pane spawn (12.1)", () => {
  test("identity is an opaque minted id — never the name, never the pane handle", () => {
    tempOrchDir();
    const { backend, envKey } = fakePaneBackend("%5");

    const agent = spawnOneIntoTab({
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "audit-1",
      cwd: "/tmp",
      space: "wsA",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    // The key passed via ORCH_AGENT_KEY IS the identity key returned to the caller.
    expect(envKey()).toBe(agent.key);

    // A1: identity is the minted id and NOTHING else — no plexer, no space, no
    // handle, and never the human name. Environment is composed separately.
    const identity = parseIdentity(agent.key);
    expect(identity).toEqual({ id: agent.key });
    expect(identity.id).not.toBe("audit-1");
    expect(identity.id).not.toBe("%5");

    const view = spawnedRecords().get(identity.id);
    expect(view).toBeDefined();
    // The agent is keyed on the minted id; the plexer, the space and the pane
    // handle are environment axes composed onto it, not parts of its key.
    expect(view!.id).toBe(agent.key);
    expect(view!.environment.space).toBe("wsA");
    expect(view!.environment.plexer).toBe("herdr");
    expect(view!.environment.handle).toBe("%5");
    expect(agentById(process.env.ORCH_DIR!, identity.id)?.name).toBe("audit-1");
  });

  test("a name freed by a dead agent is reusable, and the two agents differ in identity", () => {
    tempOrchDir();
    const spawnAudit = () => spawnOneIntoTab({
      backend: fakePaneBackend("%9").backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "audit-1",
      cwd: "/tmp",
      space: "wsC",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    // No presence is ever stamped, so the first agent is not alive: its name is
    // free immediately. Under name-as-identity this collided forever.
    const first = spawnAudit();
    const second = spawnAudit();

    expect(second.key).not.toBe(first.key);
    expect(agentById(process.env.ORCH_DIR!, parseIdentity(second.key).id)?.name).toBe("audit-1");
  });

  test("a spawned agent resolves to exactly one control-target candidate", () => {
    const dir = tempOrchDir();
    const { backend } = fakePaneBackend("%7");

    const agent = spawnOneIntoTab({
      backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "audit-2",
      cwd: "/tmp",
      space: "wsB",
      group: "tab1",
      model: "openai/gpt-5.6",
      preferredModels: [],
    });

    // The agent's bridge stamps its presence under the same key, carrying the
    // pane handle/paneId — the only join between key and backend handle.
    seedStatus(dir, agent.key, {
      key: agent.key,
      backend: "herdr",
      workspace: "wsB",
      handle: "%7",
      paneId: "%7",
      pid: process.pid,
    });

    // Both spellings (the pane id and the key itself) resolve to the one key.
    // A second re-minted identity would make these ambiguous and throw.
    expect(normalizeControlTarget("%7")).toBe(agent.key);
    expect(normalizeControlTarget(agent.key)).toBe(agent.key);
  });
});
