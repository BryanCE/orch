import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mintAgentId } from "../src/backends/identity.ts";
import { recordSpawned } from "../src/presence/store.ts";
import { registerSpawnedAgent } from "../src/store/spawn-registration.ts";
import { herdrHudActive, herdrPaneHandle } from "../src/backends/herdr/hud.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

// A1 / CLAUDE.md Rule 11: the pane HUD's two questions — "am I in a herdr pane"
// and "which pane am I" — are ENVIRONMENT, composed from `agent_plexers` and
// `agent_handles`. They used to be sliced out of the identity key
// (`<plexer>~<workspace>~<handle>`), which meant the HUD reported against the
// pane the agent was BORN in and could never follow one that moved.
describe("the herdr HUD reads its pane from the composer, never from the key", () => {
  const directories: string[] = [];
  const saved = {
    orchDir: process.env.ORCH_DIR,
    agentKey: process.env.ORCH_AGENT_KEY,
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
    process.env.ORCH_AGENT_KEY = key;
    return key;
  }

  afterEach(() => {
    for (const [name, value] of [["ORCH_DIR", saved.orchDir], ["ORCH_AGENT_KEY", saved.agentKey], ["HERDR_ENV", saved.herdrEnv], ["HERDR_SOCKET_PATH", saved.socket]] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    while (directories.length > 0) removeTempDir(directories.pop()!);
  });

  test("a herdr-placed agent reports the handle its environment carries", () => {
    const root = tempOrchDir();
    seedPaneAgent(root, "herdr", "%3");
    expect(herdrPaneHandle()).toBe("%3");
    expect(herdrHudActive()).toBe(true);
  });

  test("the handle follows the agent when it moves pane", () => {
    const root = tempOrchDir();
    const key = seedPaneAgent(root, "herdr", "%3");
    // The identity key never changes; only the environment does.
    recordSpawned(key, { adapter: "pi", handle: "%9" });
    expect(herdrPaneHandle()).toBe("%9");
    expect(process.env.ORCH_AGENT_KEY).toBe(key);
  });

  test("an agent on another plexer is not a herdr pane", () => {
    const root = tempOrchDir();
    seedPaneAgent(root, "tmux", "%1");
    expect(herdrPaneHandle()).toBeNull();
    expect(herdrHudActive()).toBe(false);
  });

  test("a process orch never launched is not a herdr pane", () => {
    tempOrchDir();
    delete process.env.ORCH_AGENT_KEY;
    expect(herdrPaneHandle()).toBeNull();
    expect(herdrHudActive()).toBe(false);
  });

  test("a key that is not a minted id resolves to no pane at all", () => {
    tempOrchDir();
    process.env.ORCH_AGENT_KEY = "herdr~wF~%3";
    expect(herdrPaneHandle()).toBeNull();
    expect(herdrHudActive()).toBe(false);
  });
});
