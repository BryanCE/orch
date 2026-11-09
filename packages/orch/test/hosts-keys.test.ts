import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { orchPublicKey, orchSshFiles, scanHostKeys, trustHostKeys } from "../src/hosts/keys.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { hostOs } from "../src/host.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
afterEach(() => { while (dirs.length) removeTempDir(dirs.pop()!); });

function orchDir(): OrchDir {
  const dir = tempOrchDir("orch-host-keys-");
  dirs.push(dir);
  return dir;
}

let made = 0;

/** A host key line, made by ssh-keygen here: no network, no other machine. */
function hostKeyLine(dir: OrchDir, host: string): string {
  made += 1;
  const key = join(dir, `host-${host}-${made}`);
  orchPublicKey(dir, SETTINGS_DEFAULTS.links);
  const keygen = Bun.spawnSync([SETTINGS_DEFAULTS.links.ssh_keygen_command, "-q", "-t", "ed25519", "-N", "", "-f", key]);
  if (keygen.exitCode !== 0) throw new Error("ssh-keygen failed");
  return `${host} ${readFileSync(`${key}.pub`, "utf8").trim().split(" ").slice(0, 2).join(" ")}`;
}

/** A stand-in ssh-keyscan that prints `line` and nothing else. */
function fakeKeyscan(dir: OrchDir, line: string): string {
  const script = join(dir, "keyscan.sh");
  writeFileSync(script, `#!/bin/sh\necho '# ${line.split(" ")[0]}:22 SSH-2.0-OpenSSH'\necho '${line}'\n`);
  chmodSync(script, 0o755);
  return script;
}

describe.skipIf(hostOs() === "windows")("orch's own ssh identity", () => {
  test("is made once, in orch's own ssh dir, with no passphrase and private permissions", () => {
    const dir = orchDir();
    const first = orchPublicKey(dir, SETTINGS_DEFAULTS.links);
    expect(first).toMatch(/^ssh-ed25519 \S+ orch@/);
    expect(orchPublicKey(dir, SETTINGS_DEFAULTS.links)).toBe(first);
    expect(statSync(orchSshFiles(dir).dir).mode & 0o777).toBe(0o700);
  });

  test("a scanned host key comes back with the fingerprint a person compares", () => {
    const dir = orchDir();
    const line = hostKeyLine(dir, "box");
    const scan = scanHostKeys({ dest: "bryan@box" }, { ...SETTINGS_DEFAULTS.links, ssh_keyscan_command: fakeKeyscan(dir, line) });
    const [key] = scan.keys;
    expect(scan.banner).toBe("SSH-2.0-OpenSSH");
    expect(key?.line).toBe(line);
    expect(key?.fingerprint).toMatch(/^256 SHA256:\S+ .*\(ED25519\)$/);
  });

  test("trusting a host's keys again replaces what it presented before", () => {
    const dir = orchDir();
    const old = hostKeyLine(dir, "box");
    const fresh = hostKeyLine(dir, "box");
    const other = hostKeyLine(dir, "other");
    trustHostKeys(dir, { dest: "other" }, SETTINGS_DEFAULTS.links, [{ line: other, fingerprint: "" }]);
    trustHostKeys(dir, { dest: "bryan@box" }, SETTINGS_DEFAULTS.links, [{ line: old, fingerprint: "" }]);
    trustHostKeys(dir, { dest: "bryan@box" }, SETTINGS_DEFAULTS.links, [{ line: fresh, fingerprint: "" }]);
    const known = readFileSync(orchSshFiles(dir).knownHosts, "utf8");
    expect(known).toContain(fresh);
    expect(known).toContain(other);
    expect(known).not.toContain(old);
    expect(existsSync(orchSshFiles(dir).knownHosts)).toBe(true);
  });
});
