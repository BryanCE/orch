// The one command a person pastes on a host to let orch in: it puts orch's pinned
// authorized_keys line where that host's sshd reads it, in that host's own shell.
import { authorizedKeysLine } from "./ssh.ts";
import { orchSshFiles } from "./keys.ts";
import { shellQuote } from "../util.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";
import type { HostShell } from "../types/host.ts";

/** Whether a host's ssh server is Windows OpenSSH, from the version line it announced. */
export function announcesWindows(banner: string | null): boolean {
  return banner?.includes("OpenSSH_for_Windows") === true;
}

/** The shell a host lands in: what the person said, else Windows means orch runs in WSL. */
export function hostShellFor(stated: HostShell | undefined, banner: string | null): HostShell {
  return stated ?? (announcesWindows(banner) ? "wsl" : "posix");
}

/** Where to paste, and what. */
export interface AuthorizeStep {
  readonly where: string;
  readonly command: string;
}

/** PowerShell single quotes take everything literally but a single quote, which doubles. */
function powershellQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/** Windows OpenSSH reads an administrator's keys from one shared file, which it ignores
 *  unless only Administrators and SYSTEM can touch it; everyone else's from their profile. */
function windowsCommand(line: string): string {
  return [
    // PowerShell's first-run progress records come back over ssh as CLIXML noise.
    "$ProgressPreference='SilentlyContinue'",
    `$k=${powershellQuote(line)}`,
    `if ((Get-LocalGroupMember Administrators).Name -like "*\\$env:USERNAME") { $f="$env:ProgramData\\ssh\\administrators_authorized_keys"; Add-Content $f $k; icacls $f /inheritance:r /grant Administrators:F /grant SYSTEM:F | Out-Null } else { New-Item -ItemType Directory -Force "$HOME\\.ssh" | Out-Null; Add-Content "$HOME\\.ssh\\authorized_keys" $k }`,
    `"orch's key is authorized here."`,
  ].join("; ");
}

function posixCommand(line: string): string {
  return `mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh" && printf '%s\\n' ${shellQuote(line)} >> "$HOME/.ssh/authorized_keys" && chmod 600 "$HOME/.ssh/authorized_keys" && echo "orch's key is authorized here."`;
}

/** The script that authorizes orch's key on a host, in that host's own language. */
function authorizeScript(host: HostSettings, publicKey: string): string {
  const line = authorizedKeysLine(host, publicKey);
  return host.shell === "wsl" ? windowsCommand(line) : posixCommand(line);
}

/** The far command that runs the script whatever shell the login lands in: PowerShell
 *  takes it encoded, so neither cmd nor PowerShell as sshd's shell can mangle it. */
function authorizeRemoteCommand(host: HostSettings, publicKey: string): string {
  const script = authorizeScript(host, publicKey);
  if (host.shell === "wsl") return `powershell -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(script, "utf16le").toString("base64")}`;
  return `sh -c ${shellQuote(script)}`;
}

/** ssh, logged in as the person, once, to put orch's key in place: their own config and
 *  keys, or their password at the prompt, checked against the host key they just confirmed.
 *  Every link after this uses orch's own key, which can run nothing but orch host serve. */
export function authorizeArgv(orchDir: OrchDir, host: HostSettings, links: OrchSettings["links"], publicKey: string): string[] {
  return [
    "-o", `UserKnownHostsFile="${orchSshFiles(orchDir).knownHosts}"`,
    "-o", "StrictHostKeyChecking=yes",
    "-o", `ConnectTimeout=${links.connect_timeout_s}`,
    ...(host.port === undefined ? [] : ["-p", String(host.port)]),
    "--", host.dest, authorizeRemoteCommand(host, publicKey),
  ];
}

export function authorizeStep(host: HostSettings, publicKey: string): AuthorizeStep {
  const line = authorizedKeysLine(host, publicKey);
  return host.shell === "wsl"
    ? { where: "PowerShell as Administrator", command: windowsCommand(line) }
    : { where: "a terminal", command: posixCommand(line) };
}
