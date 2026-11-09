// orch's own ssh identity, kept apart from the user's ~/.ssh: one key, and the host keys
// orch trusts. The user's keys and config are never read, so a host orch was not told
// about cannot be reached through orch, and a host the user reaches with a key of their
// own never sees orch's.
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { hostIdentity } from "./identity.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";

export interface OrchSshFiles {
  readonly dir: string;
  readonly key: string;
  readonly publicKey: string;
  readonly knownHosts: string;
}

export function orchSshFiles(orchDir: OrchDir): OrchSshFiles {
  const dir = join(orchDir, "ssh");
  return { dir, key: join(dir, "id_ed25519"), publicKey: join(dir, "id_ed25519.pub"), knownHosts: join(dir, "known_hosts") };
}

function ensureSshDir(files: OrchSshFiles): void {
  mkdirSync(files.dir, { recursive: true, mode: 0o700 });
  chmodSync(files.dir, 0o700);
}

/** orch's public key, made the first time it is asked for. It has no passphrase: orchd
 *  dials hosts with no one at a prompt, which is why a host's authorized_keys pins it
 *  to `orch host serve` and nothing else. */
export function orchPublicKey(orchDir: OrchDir, links: OrchSettings["links"]): string {
  const files = orchSshFiles(orchDir);
  if (!existsSync(files.key)) {
    ensureSshDir(files);
    execFileSync(links.ssh_keygen_command, ["-q", "-t", "ed25519", "-N", "", "-C", `orch@${hostIdentity().name}`, "-f", files.key], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
  }
  return readFileSync(files.publicKey, "utf8").trim();
}

/** The machine a destination names, without the user. */
export function destinationHost(dest: string): string {
  return dest.slice(dest.lastIndexOf("@") + 1);
}

export interface HostKey {
  /** The known_hosts line, as ssh-keyscan wrote it. */
  readonly line: string;
  /** What a person compares: bits, SHA256 digest, and type. */
  readonly fingerprint: string;
}

/** What a host presented when asked: its keys, and the version line its ssh server announced. */
export interface HostScan {
  readonly keys: readonly HostKey[];
  /** `SSH-2.0-OpenSSH_for_Windows_9.5` and the like; null when the server announced none. */
  readonly banner: string | null;
}

/** The keys a host presents right now, each with the fingerprint a person checks. */
export function scanHostKeys(host: HostSettings, links: OrchSettings["links"]): HostScan {
  const args = ["-T", String(links.connect_timeout_s), ...(host.port === undefined ? [] : ["-p", String(host.port)]), destinationHost(host.dest)];
  const scanned = execFileSync(links.ssh_keyscan_command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const lines = scanned.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "");
  // ssh-keyscan writes `# host:port SSH-2.0-...` for each key it asked for.
  const banner = lines.find((line) => line.startsWith("#"))?.split(/\s+/)[2] ?? null;
  const keys = lines.filter((line) => !line.startsWith("#")).map((line) => ({
    line,
    fingerprint: execFileSync(links.ssh_keygen_command, ["-lf", "-"], { input: `${line}\n`, encoding: "utf8", windowsHide: true }).trim(),
  }));
  return { keys, banner };
}

/** The port ssh uses when a host names none; known_hosts writes it bare. */
const SSH_DEFAULT_PORT = 22;

/** How known_hosts names a host: bare on the default port, bracketed with its port otherwise. */
function knownHostsName(host: HostSettings): string {
  const name = destinationHost(host.dest);
  return host.port === undefined || host.port === SSH_DEFAULT_PORT ? name : `[${name}]:${host.port}`;
}

/** Trust these keys for a host's links from now on, in place of any it presented before. */
export function trustHostKeys(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"], keys: readonly HostKey[]): void {
  const files = orchSshFiles(orchDir);
  ensureSshDir(files);
  if (existsSync(files.knownHosts)) {
    execFileSync(links.ssh_keygen_command, ["-R", knownHostsName(host), "-f", files.knownHosts], { stdio: "ignore", windowsHide: true });
  }
  appendFileSync(files.knownHosts, keys.map((key) => `${key.line}\n`).join(""), { mode: 0o600 });
}
