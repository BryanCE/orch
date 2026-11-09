// The one script that lets orch in on a host, run there once as the person: it finds the
// shell their account logs in with, puts orch's pinned authorized_keys line where that
// host's sshd reads it, in place of any line orch's key had before, and reports the orch
// that line will start.
import { authorizedKeysLine, LOGIN_SHELL_SLOT } from "./ssh.ts";
import { orchSshFiles } from "./keys.ts";
import { shellQuote } from "../util.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";
import { hostIdentity } from "../host.ts";

/** Whether a host's ssh server is Windows OpenSSH, from the version line it announced. */
export function announcesWindows(banner: string | null): boolean {
  return banner?.includes("OpenSSH_for_Windows") === true;
}

/** Whether ssh lands in Windows on this host, wherever orch runs there. */
function landsInWindows(host: HostSettings): boolean {
  return host.shell === "wsl" || host.shell === "windows";
}

/** Where to paste, and what. */
export interface AuthorizeStep {
  readonly where: string;
  readonly command: string;
}

/** The line the script ends with: the orch the authorized line starts, or nothing found. */
const ORCH_REPORT = "orch=";

/** The orch a host reported, from what the script printed; null when it found none. */
export function reportedOrch(output: string): string | null {
  const report = output.split(/\r?\n/).reverse().find((line) => line.startsWith(ORCH_REPORT));
  const path = report?.slice(ORCH_REPORT.length).trim() ?? "";
  return path === "" ? null : path;
}

/** The part of a public key that names it, without its type or comment. */
function keyBody(publicKey: string): string {
  return publicKey.split(/\s+/)[1] ?? publicKey;
}

/** PowerShell single quotes take everything literally but a single quote, which doubles. */
function powershellQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/** The PowerShell that finds the orch a Windows host will start: inside WSL, through the WSL
 *  account's own shell, which also fills that shell into the line; on Windows, on its PATH. */
function windowsLocateOrch(host: HostSettings): string[] {
  if (host.shell === "windows") return ["$o=(Get-Command orch -ErrorAction SilentlyContinue).Source"];
  return [
    "$s=((wsl.exe -e getent passwd (wsl.exe -e id -un)) -split ':')[6]",
    `$k=$k.Replace(${powershellQuote(LOGIN_SHELL_SLOT)},$s)`,
    "$o=wsl.exe -e $s -lic 'command -v orch' 2>$null | Select-Object -Last 1",
  ];
}

/** Windows OpenSSH reads an administrator's keys from one shared file, which it ignores
 *  unless only Administrators and SYSTEM can touch it; everyone else's from their profile. */
function windowsCommand(host: HostSettings, publicKey: string): string {
  return [
    // PowerShell's first-run progress records come back over ssh as CLIXML noise.
    "$ProgressPreference='SilentlyContinue'",
    `$k=${powershellQuote(authorizedKeysLine(host, publicKey, hostIdentity().id))}`,
    `$b=${powershellQuote(keyBody(publicKey))}`,
    ...windowsLocateOrch(host),
    `if ((Get-LocalGroupMember Administrators).Name -like "*\\$env:USERNAME") { $f="$env:ProgramData\\ssh\\administrators_authorized_keys" } else { New-Item -ItemType Directory -Force "$HOME\\.ssh" | Out-Null; $f="$HOME\\.ssh\\authorized_keys" }`,
    "$rest=@(); if (Test-Path $f) { $rest=@(Get-Content $f | Where-Object { $_ -notlike \"*$b*\" }) }",
    "Set-Content $f ($rest + $k)",
    "if ($f -like '*administrators_authorized_keys') { icacls $f /inheritance:r /grant Administrators:F /grant SYSTEM:F | Out-Null }",
    `"orch's key is authorized here."`,
    `"${ORCH_REPORT}$o"`,
  ].join("; ");
}

function posixCommand(host: HostSettings, publicKey: string): string {
  return [
    `s="$SHELL"; k=$(printf '%s' ${shellQuote(authorizedKeysLine(host, publicKey, hostIdentity().id))} | sed "s|${LOGIN_SHELL_SLOT}|$s|"); f="$HOME/.ssh/authorized_keys"`,
    `mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh" && touch "$f"`,
    `{ grep -vF ${shellQuote(keyBody(publicKey))} "$f" || true; } > "$f.orch" && printf '%s\\n' "$k" >> "$f.orch" && mv "$f.orch" "$f" && chmod 600 "$f"`,
    `echo "orch's key is authorized here."`,
    `echo "${ORCH_REPORT}$("$s" -lic 'command -v orch' </dev/null 2>/dev/null | tail -n 1)"`,
  ].join("; ");
}

/** The script that authorizes orch's key on a host, in that host's own language. */
function authorizeScript(host: HostSettings, publicKey: string): string {
  return landsInWindows(host) ? windowsCommand(host, publicKey) : posixCommand(host, publicKey);
}

/** The far command that runs the script whatever shell the login lands in: PowerShell
 *  takes it encoded, so neither cmd nor PowerShell as sshd's shell can mangle it. */
function authorizeRemoteCommand(host: HostSettings, publicKey: string): string {
  const script = authorizeScript(host, publicKey);
  if (landsInWindows(host)) return `powershell -NoProfile -NonInteractive -EncodedCommand ${Buffer.from(script, "utf16le").toString("base64")}`;
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
  return landsInWindows(host)
    ? { where: "PowerShell as Administrator", command: windowsCommand(host, publicKey) }
    : { where: "a terminal", command: posixCommand(host, publicKey) };
}
