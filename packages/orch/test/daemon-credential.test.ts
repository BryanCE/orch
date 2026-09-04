import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { endpointPaths } from "../src/daemon/rpc/wire.ts";
import { startRpcServer } from "../src/daemon/rpc/server.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { RpcServer } from "../src/types/daemon.ts";

/**
 * Credential is the `0600` token file in `$ORCH_DIR`; same-uid is the whole
 * trust boundary.
 *
 * B4 rejects peer credentials outright (node exposes neither `SO_PEERCRED` nor
 * process ancestry portably), so the file modes ARE the boundary. If the
 * directory is world-readable, "same-uid" is a claim the filesystem does not
 * make, and every presence dir, agent name and cwd in it is readable by any
 * other account on the machine.
 */

const dirs: string[] = [];
const servers: RpcServer[] = [];

afterEach(async () => {
  while (servers.length) await servers.pop()!.close();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function tempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-credential-"));
  dirs.push(directory);
  return directory;
}

async function start(orchDir: string): Promise<RpcServer> {
  const server = await startRpcServer(orchDir, {});
  servers.push(server);
  return server;
}

/** The permission bits, without the file-type bits statSync also carries. */
function mode(path: string): number {
  return statSync(path).mode & 0o777;
}

/** NTFS carries no owner/group/other bits — statSync reports 0o666 whatever chmod did — so
 *  the filesystem boundary below is a POSIX fact. It stays asserted on every POSIX run. */
const posixOnlyTest = test.skipIf(process.platform === "win32");

describe("the token file is the whole credential", () => {
  posixOnlyTest("the token is 0600", async () => {
    const orchDir = tempDir();
    await start(orchDir);
    expect(mode(endpointPaths(orchDir).token)).toBe(0o600);
  });

  posixOnlyTest("$ORCH_DIR is 0700, so same-uid is a boundary the filesystem enforces", async () => {
    const orchDir = tempDir();
    // mkdtemp hands back 0700 already, which would make this assertion pass
    // without the daemon doing anything. Loosen it first so the test measures
    // orch, not the tmpdir convention — a real $ORCH_DIR is created by
    // `mkdirSync(orchDir, { recursive: true })` under the user's umask, which
    // on a default umask of 022 is 0755.
    chmodSync(orchDir, 0o755);
    await start(orchDir);

    // A 0755 directory leaves the token unreadable but everything beside it
    // readable: every presence dir, agent name and cwd. The row says same-uid
    // is the WHOLE trust boundary, so the directory has to be one too.
    expect(mode(orchDir)).toBe(0o700);
  });

  posixOnlyTest("a token left loose by an earlier run is tightened, not trusted", async () => {
    const orchDir = tempDir();
    const token = endpointPaths(orchDir).token;
    mkdirSync(join(token, ".."), { recursive: true });
    writeFileSync(token, "stale\n");
    chmodSync(token, 0o644);

    await start(orchDir);
    // chmod is not implied when writeFileSync truncates an existing file, so a
    // world-readable token would survive a restart unless the mode is reapplied.
    expect(mode(token)).toBe(0o600);
  });

  posixOnlyTest("a runtime directory the daemon creates is 0700 too", async () => {
    const orchDir = tempDir();
    const runtime = join(endpointPaths(orchDir).token, "..");
    mkdirSync(runtime, { recursive: true });
    chmodSync(runtime, 0o755);
    await start(orchDir);
    expect(mode(runtime)).toBe(0o700);
  });

  test("nothing else is enrolled: there is no allowlist beside the token", async () => {
    const orchDir = tempDir();
    await start(orchDir);
    // Presenting the token IS the credential (B2), and peer credentials are
    // rejected (B4). A second file that also decides who may connect would be a
    // second trust boundary with its own bugs.
    const entries = readdirSync(orchDir, { recursive: true, encoding: "utf8" });
    for (const entry of entries) {
      expect(entry).not.toMatch(/allowlist|authorized|clients\./);
    }
  });
});
