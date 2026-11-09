/** The operating systems orch can be installed on. WSL is not a fourth OS: a WSL
 *  process is a Linux process for pids, sockets and paths, and what WSL adds is a
 *  reachable Windows disk, which is the `wsl` flag on {@link Host}. */
export const HOST_OS_VALUES = ["linux", "windows", "darwin"] as const;
export type HostOs = (typeof HOST_OS_VALUES)[number];
/** What this process runs on, resolved once at a composition root. */
export interface Host { readonly os: HostOs; readonly wsl: boolean; }

/** Where orch is installed on a host, which decides how ssh starts it there. `posix` is a
 *  Linux or macOS host; `wsl` is a Windows host whose OpenSSH lands in Windows and runs orch
 *  inside WSL; `windows` is a Windows host running orch on Windows itself. */
export const HOST_SHELLS = ["posix", "wsl", "windows"] as const;
export type HostShell = (typeof HOST_SHELLS)[number];

/** Which machine a process runs on. The id is the OS's own machine id, hashed: two
 *  machines that share a hostname never merge, and the Windows and WSL sides of one
 *  box are two hosts, because each OS mints its own. The name is for people. */
export interface HostIdentity { readonly id: string; readonly name: string; readonly os: HostOs; }

/** What the far end of a host link says first: which host it is, and which orch build
 *  answers there. */
export interface HostGreeting {
  readonly host: HostIdentity;
  /** Digest of the far side's installed entrypoint; null when it runs from source. */
  readonly codeHash: string | null;
  readonly version: string;
}

/** The kinds of state a host link is in: no attempt yet this orchd run, dialing,
 *  up, or down after an attempt failed. */
export const HOST_LINK_STATES = ["idle", "connecting", "up", "down"] as const;
export type HostLinkStateKind = (typeof HOST_LINK_STATES)[number];

/** One configured host's link, as orchd reports it. */
export interface HostLinkView {
  readonly name: string;
  readonly dest: string;
  readonly state: HostLinkStateKind;
  /** The id this name is bound to; null until the host first answered. */
  readonly hostId: string | null;
  readonly greeting: HostGreeting | null;
  readonly reason: string | null;
  /** When the far side last answered, over any link this or an earlier orchd held. */
  readonly lastSeen: number | null;
}
