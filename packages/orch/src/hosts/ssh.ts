// The one place an ssh command line is built. Every reach to another host goes through
// here, with orch's own key and known hosts and no ssh config at all, so the options
// that decide which machine orch reaches, as whom, and when it counts as gone are set once.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { orchSshFiles } from "./keys.ts";
import { shellQuote } from "../util.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostId } from "../types/host.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";

/** The words orch sends as a far command. Plain words need no quoting in any shell a
 *  host lands in, which is what lets one string serve sh, cmd and an authorized_keys line. */
const FAR_WORD = /^[\w-]+$/;

/** Options on every ssh orch runs.
 *  `-F none` and `IdentitiesOnly`: no ~/.ssh/config and no key but orch's, so orch reaches
 *  only what settings.hosts names, and only as itself.
 *  `StrictHostKeyChecking=yes` against orch's own known_hosts: a host orch was not told to
 *  trust, or one whose key changed, is refused rather than accepted.
 *  `BatchMode`: orchd has no terminal to prompt on.
 *  `LogLevel=ERROR`: ssh's notices about the far server, such as an old key exchange, are
 *  not why a link failed and would bury the reason that is. */
function sshOptions(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"]): string[] {
  const files = orchSshFiles(orchDir);
  return [
    "-F", "none",
    "-i", files.key,
    "-o", "IdentitiesOnly=yes",
    "-o", `UserKnownHostsFile="${files.knownHosts}"`,
    "-o", "StrictHostKeyChecking=yes",
    "-o", "BatchMode=yes",
    "-o", "LogLevel=ERROR",
    "-o", `ConnectTimeout=${links.connect_timeout_s}`,
    "-o", `ServerAliveInterval=${links.keepalive_interval_s}`,
    "-o", `ServerAliveCountMax=${links.keepalive_count}`,
    ...(host.port === undefined ? [] : ["-p", String(host.port)]),
  ];
}

/** Where a forced command names the shell the host's account logs in with. The script that
 *  authorizes orch's key fills it in on the host itself, where that shell is known. */
export const LOGIN_SHELL_SLOT = "@LOGIN_SHELL@";

/** Characters cmd treats as syntax inside a quoted `set`, which a Windows ORCH_DIR cannot hold. */
const CMD_SYNTAX = /["%&|<>^]/;

function farWords(args: readonly string[]): string {
  const bad = args.find((arg) => !FAR_WORD.test(arg));
  if (bad !== undefined) throw new Error(`a far command is plain words; ${JSON.stringify(bad)} is not one`);
  return args.join(" ");
}

/** `orch <args>` as a host runs it, from wherever its orch is installed.
 *  posix and wsl: through the account's own shell, interactive and login, so the PATH is the
 *  one that person's terminal has. nvm and the like load from ~/.bashrc, which any other
 *  shell skips; inside WSL, that PATH also puts the Linux orch ahead of the Windows one WSL
 *  sees on the Windows PATH.
 *  windows: straight to the shell Windows OpenSSH runs commands in, which finds orch on the
 *  account's own PATH. */
export function remoteOrchCommand(host: HostSettings, args: readonly string[]): string {
  const words = farWords(args);
  if (host.shell === "windows") {
    if (host.orch_dir === undefined) return `orch ${words}`;
    if (CMD_SYNTAX.test(host.orch_dir)) throw new Error(`orch_dir for a windows host cannot hold any of " % & | < > ^: ${host.orch_dir}`);
    return `cmd /d /c "set ORCH_DIR=${host.orch_dir}&& orch ${words}"`;
  }
  const env = host.orch_dir === undefined ? "" : `env ORCH_DIR=${shellQuote(host.orch_dir)} `;
  const command = `exec ${env}orch ${words}`;
  if (host.shell === "wsl") {
    if (command.includes("\"")) throw new Error(`orch_dir for a wsl host cannot hold a double quote: ${host.orch_dir ?? ""}`);
    return `wsl.exe -e ${LOGIN_SHELL_SLOT} -lic "${command}"`;
  }
  return `${LOGIN_SHELL_SLOT} -lic ${shellQuote(command)}`;
}

/** The argv after the ssh binary. The command it sends is only words: the forced command in
 *  the host's authorized_keys line decides how orch runs there. */
export function sshArgv(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"], args: readonly string[]): string[] {
  return [...sshOptions(orchDir, host, links), "--", host.dest, `orch ${farWords(args)}`];
}

/** The authorized_keys line that lets orch's key run `orch host serve` on a host and
 *  nothing else: `restrict` drops forwarding, agent and pty, and `command=` replaces
 *  whatever the client asks for. A stolen orch key buys a link and no shell. The line
 *  holds {@link LOGIN_SHELL_SLOT} until the host fills it in. */
export function authorizedKeysLine(host: HostSettings, publicKey: string, origin: HostId): string {
  const forced = remoteOrchCommand(host, ["host", "serve", "--origin", origin]).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
  return `restrict,command="${forced}" ${publicKey}`;
}

/** Start `orch <args>` on a host with stdin, stdout and stderr piped back here. */
export function spawnRemoteOrch(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"], args: readonly string[]): ChildProcessWithoutNullStreams {
  return spawn(links.ssh_command, sshArgv(orchDir, host, links, args), { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
}
