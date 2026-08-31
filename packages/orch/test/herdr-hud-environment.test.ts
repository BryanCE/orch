import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mintAgentId } from "../src/backends/identity.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { herdrHudActive, herdrPaneHandle } from "../src/backends/herdr/hud.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { placeAgent } from "./helpers/agent.ts";
import { isolateOrchEnv, restoreOrchEnv } from "./helpers/env.ts";

// A1 / CLAUDE.md Rule 11: the pane HUD's two questions — "am I in a herdr pane"
// and "which pane am I" — are ENVIRONMENT, composed from `agent_plexers` and
// `agent_handles`. They used to be sliced out of the identity key
// (`<plexer>~<workspace>~<handle>`), which meant the HUD reported against the
// pane the agent was BORN in and could never follow one that moved.
describe("the herdr HUD reads its pane from the composer, never from the key", () => {
  const directories: string[] = [];
  const saved = {
    herdrEnv: process.env.HERDR_ENV,
    socket: process.env.HERDR_SOCKET_PATH,
  };

  function tempOrchDir(): string {
    const directory = mkdtempSync(join(tmpdir(), "orch-herdr-hud-"));
    directories.push(directory);
    process.env.ORCH_DIR = directory;
    return directory;
  }

  function seedPaneAgent(root: string, plexer: string, handle: string): string {
    const key = mintAgentId();
    registerSpawnedAgent(root, { key, harnessId: "pi", backendId: plexer, pane: true, handle, cwd: root, name: "recon", model: "test", spawner: null });
    return key;
  }

  beforeEach(() => {
    isolateOrchEnv();
  });

  afterEach(() => {
    restoreOrchEnv();
    for (const [name, value] of [["HERDR_ENV", saved.herdrEnv], ["HERDR_SOCKET_PATH", saved.socket]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    while (directories.length > 0) removeTempDir(directories.pop()!);
  });

  test("a herdr-placed agent reports the handle its environment carries", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "herdr", "%3");
    expect(process.env[LAUNCH_ENV]).toBeUndefined();
    expect(herdrPaneHandle(key)).toBe("%3");
    expect(herdrHudActive(key)).toBe(true);
  });

  test("the handle follows the agent when it moves pane", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "herdr", "%3");
    // The identity key never changes; only the environment does.
    placeAgent(key, { adapter: "pi", handle: "%9" });
    expect(herdrPaneHandle(key)).toBe("%9");
    expect(process.env[LAUNCH_ENV]).toBeUndefined();
  });

  test("an agent on another plexer is not a herdr pane", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "tmux", "%1");
    expect(herdrPaneHandle(key)).toBeNull();
    expect(herdrHudActive(key)).toBe(false);
  });

  test("a process orch never launched is not a herdr pane", () => {
    tempOrchDir();
    expect(herdrPaneHandle(null)).toBeNull();
    expect(herdrHudActive(null)).toBe(false);
  });

  test("a key that is not a minted id resolves to no pane at all", () => {
    tempOrchDir();
    // A NEGATIVE case, kept verbatim: the dead composite key looks like it
    // carries a plexer and a handle, and nothing may read them back out of it.
    const malformed = "herdr~wF~%3";
    expect(herdrPaneHandle(malformed)).toBeNull();
    expect(herdrHudActive(malformed)).toBe(false);
  });
});
