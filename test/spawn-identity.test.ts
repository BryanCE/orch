import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnOneIntoTab } from "../src/commands/spawn.ts";
import { parseIdentity, normalizeControlTarget } from "../src/backends/identity.ts";
import { spawnedRecords } from "../src/presence/store.ts";
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
      workspace: "wsA",
      group: "tab1",
      model: null,
    });

    // The key passed via ORCH_AGENT_KEY IS the identity key returned to the caller.
    expect(envKey()).toBe(agent.key);

    const identity = parseIdentity(agent.key);
    expect(identity.backend).toBe("herdr");
    expect(identity.workspace).toBe("wsA");
    // Identity is minted, so it carries neither the human name nor the pane handle.
    expect(identity.id).not.toBe("audit-1");
    expect(identity.id).not.toBe("%5");

    const record = spawnedRecords().get(agent.key);
    expect(record).toBeDefined();
    // Registry row keyed on the env key — never a second identity re-minted from the pane.
    expect(record!.pane).toBe(agent.key);
    expect(record!.workspace).toBe("wsA");
    expect(record!.backend).toBe("herdr");
    // Name and pane handle are plain columns beside the key, not part of it.
    expect(record!.name).toBe("audit-1");
    expect(record!.handle).toBe("%5");
  });

  test("a name freed by a dead agent is reusable, and the two agents differ in identity", () => {
    tempOrchDir();
    const spawnAudit = () => spawnOneIntoTab({
      backend: fakePaneBackend("%9").backend,
      adapter: piAdapter,
      adapterId: "pi",
      name: "audit-1",
      cwd: "/tmp",
      workspace: "wsC",
      group: "tab1",
      model: null,
    });

    // No presence is ever stamped, so the first agent is not alive: its name is
    // free immediately. Under name-as-identity this collided forever.
    const first = spawnAudit();
    const second = spawnAudit();

    expect(second.key).not.toBe(first.key);
    expect(spawnedRecords().get(second.key)!.name).toBe("audit-1");
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
      workspace: "wsB",
      group: "tab1",
      model: null,
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
