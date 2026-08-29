import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeAllStores, openStore } from "../src/store/connection.ts";
import { getOrCreateSessionAgent } from "../src/store/agent-rows.ts";
import { agentView } from "../src/store/agent-view.ts";
import { endpointPaths, helloClaim } from "../src/daemon/rpc.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedSpace } from "./helpers/space.ts";

/**
 * TASKS/02-scope.md B9 — "`hello` is also where the ENVIRONMENT is recorded in
 * full — harness, plexer, directory, space, OS side. It is NOT filled in later
 * or inferred at use, because it is what dictates everything that agent can do."
 *
 * A16/E17 put the plexer on its own satellite and the OS side on `hosts`. B9 is
 * about WHEN they are written: registration, once, from what the caller states.
 */

const dirs: string[] = [];
const saved: Record<string, string | undefined> = {};
const ENV = ["ORCH_DIR", "ORCH_SPACE", "ORCH_HARNESS"];

afterEach(() => {
  closeAllStores();
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function storeDir(): string {
  for (const name of ENV) saved[name] = process.env[name];
  const directory = mkdtempSync(join(tmpdir(), "orch-hello-env-"));
  dirs.push(directory);
  const db = openStore(directory);
  db.query("INSERT INTO harnesses (id, name) VALUES ('claude', 'claude') ON CONFLICT DO NOTHING").run();
  db.query("INSERT INTO plexers (id, name) VALUES ('herdr', 'herdr') ON CONFLICT DO NOTHING").run();
  return directory;
}

function register(directory: string, extra: { space?: string | null; plexerId?: string | null } = {}) {
  return getOrCreateSessionAgent(directory, {
    pid: 4242, startToken: "tok", sessionToken: "sess-1", harnessId: "claude",
    cwd: "/w", label: "claude session", hostId: "h", hostName: "h", hostOs: "linux",
    plexerId: extra.plexerId ?? null, plexerVersion: extra.plexerId ? "1.0" : null,
    space: extra.space ?? null, now: 1,
  });
}

describe("hello records the environment in full", () => {
  test("the plexer the caller registered in is on the agent, not only on the host", () => {
    const directory = storeDir();
    const session = register(directory, { plexerId: "herdr" });

    // host_plexers says "herdr is installed on this machine" (E17). It does not
    // say where THIS agent is, and B9 is about the agent's own environment.
    expect(agentView(directory, session.id)?.environment.plexer).toBe("herdr");
  });

  test("the space the caller registered in is recorded at hello, not inferred later", () => {
    const directory = storeDir();
    seedSpace(directory, "server");
    const session = register(directory, { space: "server" });

    expect(agentView(directory, session.id)?.environment.space).toBe("server");
  });

  test("a session in no space and no plexer records neither, and that is an answer", () => {
    const directory = storeDir();
    const session = register(directory);

    // A7: a space is optional. A capless environment is one with no shortcut,
    // not one orch cannot talk to — absence is the answer, never "local".
    expect(agentView(directory, session.id)?.environment.space).toBeNull();
    expect(agentView(directory, session.id)?.environment.plexer).toBeNull();
  });

  test("re-registering the same session does not re-root or re-place it", () => {
    const directory = storeDir();
    seedSpace(directory, "server");
    const first = register(directory, { space: "server", plexerId: "herdr" });
    const second = register(directory, { space: "server", plexerId: "herdr" });

    expect(second.id).toBe(first.id);
    const view = agentView(directory, first.id)!;
    expect(view.environment.plexer).toBe("herdr");
    expect(view.environment.space).toBe("server");
    // One open interval per axis: a second hello must not open a second row.
    const open = openStore(directory)
      .query("SELECT COUNT(*) AS n FROM agent_spaces WHERE agent_id = ? AND until IS NULL").get(first.id);
    expect(open).toEqual({ n: 1 });
  });

  test("the claim carries every environment fact hello has to record", () => {
    const directory = storeDir();
    process.env.ORCH_DIR = directory;
    process.env.ORCH_SPACE = "server";
    const token = endpointPaths(directory).token;
    mkdirSync(dirname(token), { recursive: true });
    writeFileSync(token, "test-token", { mode: 0o600 });

    // The daemon must not OBSERVE the environment on the caller's behalf: it
    // runs in one place and the caller may be in another (a WSL daemon and a
    // Windows-side session is the case this repo lives with). Every fact B9
    // names travels in the claim.
    const claim = helloClaim(directory);
    expect(Object.keys(claim)).toEqual(expect.arrayContaining([
      "harness", "cwd", "space", "plexer", "hostName", "hostOs",
    ]) as string[]);
    expect(claim.space).toBe("server");
    expect(claim.cwd).toBe(process.cwd());
  });
});
