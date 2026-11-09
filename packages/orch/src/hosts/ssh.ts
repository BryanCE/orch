// The one place an ssh command line is built. Every reach to another host goes through
// here, with orch's own key and known hosts and no ssh config at all, so the options
// that decide which machine orch reaches, as whom, and when it counts as gone are set once.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { orchSshFiles } from "./keys.ts";
import { shellQuote } from "../util.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";

/** The words orch sends as a far command. Plain words need no quoting in any shell a
 *  host lands in, which is what lets one string serve sh, cmd and an authorized_keys line. */
const FAR_WORD = /^[\w-]+$/;

/** Options on every ssh orch runs.
 *  `-F none` and `IdentitiesOnly`: no ~/.ssh/config and no key but orch's, so orch reaches
 *  only what settings.hosts names, and only as itself.
 *  `StrictHostKeyChecking=yes` against orch's own known_hosts: a host orch was not told to
 *  trust, or one whose key changed, is refused rather than accepted.
 *  `BatchMode`: orchd has no terminal to prompt on. */
function sshOptions(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"]): string[] {
  const files = orchSshFiles(orchDir);
  return [
    "-F", "none",
    "-i", files.key,
    "-o", "IdentitiesOnly=yes",
    "-o", `UserKnownHostsFile="${files.knownHosts}"`,
    "-o", "StrictHostKeyChecking=yes",
    "-o", "BatchMode=yes",
    "-o", `ConnectTimeout=${links.connect_timeout_s}`,
    "-o", `ServerAliveInterval=${links.keepalive_interval_s}`,
    "-o", `ServerAliveCountMax=${links.keepalive_count}`,
    ...(host.port === undefined ? [] : ["-p", String(host.port)]),
  ];
}

/** `orch <args>` as the far side runs it: from a login `sh`, so the PATH the user's profile
 *  sets is the one that finds orch; through `wsl.exe` on a Windows host running orch in WSL. */
export function remoteOrchCommand(host: HostSettings, args: readonly string[]): string {
  const bad = args.find((arg) => !FAR_WORD.test(arg));
  if (bad !== undefined) throw new Error(`a far command is plain words; ${JSON.stringify(bad)} is not one`);
  const env = host.orch_dir === undefined ? "" : `env ORCH_DIR=${shellQuote(host.orch_dir)} `;
  const command = `exec ${env}orch ${args.join(" ")}`;
  if (host.shell === "wsl") {
    if (command.includes("\"")) throw new Error(`orch_dir for a wsl host cannot hold a double quote: ${host.orch_dir ?? ""}`);
    return `wsl.exe -e sh -lc "${command}"`;
  }
  return `sh -lc ${shellQuote(command)}`;
}

/** The argv after the ssh binary. */
export function sshArgv(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"], args: readonly string[]): string[] {
  return [...sshOptions(orchDir, host, links), "--", host.dest, remoteOrchCommand(host, args)];
}

/** The authorized_keys line that lets orch's key run `orch host serve` on a host and
 *  nothing else: `restrict` drops forwarding, agent and pty, and `command=` replaces
 *  whatever the client asks for. A stolen orch key buys a link and no shell. */
export function authorizedKeysLine(host: HostSettings, publicKey: string): string {
  const forced = remoteOrchCommand(host, ["host", "serve"]).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
  return `restrict,command="${forced}" ${publicKey}`;
}

/** Start `orch <args>` on a host with stdin, stdout and stderr piped back here. */
export function spawnRemoteOrch(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"], args: readonly string[]): ChildProcessWithoutNullStreams {
  return spawn(links.ssh_command, sshArgv(orchDir, host, links, args), { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
}
