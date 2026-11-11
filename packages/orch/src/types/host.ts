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

/** Which machine, by the id its own OS mints. Minted only by `hostIdFrom` in `src/host.ts`,
 *  which every boundary (this host's own identity, a stored row, a wire value) goes
 *  through, so a bare string can never stand in for one. */
export type HostId = string & { readonly __brand: "HostId" };

/** Which machine a process runs on. The id is the OS's own machine id, hashed: two
 *  machines that share a hostname never merge, and the Windows and WSL sides of one
 *  box are two hosts, because each OS mints its own. The name is for people. */
export interface HostIdentity { readonly id: HostId; readonly name: string; readonly os: HostOs; }

/** Who asked for an agent, when another host's orchd asked this one to run it: that host,
 *  and the agent there whose spawn started it. Immutable provenance. Everything the agent
 *  spawns here carries the same origin, so that host can follow the whole tree. */
export interface AgentOrigin {
  /** The host whose orchd asked this one to run the agent. Never where it runs: an agent
   *  with an origin runs here. */
  readonly askedBy: HostId;
  /** The spawning agent on that host; it lives in that host's store, never this one. */
  readonly spawner: string | null;
}

/** What the far end of a host link says first: which host it is, and which orch build
 *  answers there. */
export interface HostGreeting {
  readonly host: HostIdentity;
  /** The commit the far side's orch was built from; null when it runs from source. */
  readonly commit: string | null;
  readonly version: string;
}

/** What a signal sent over a link found: the recorded process instance was there and got
 *  it, or it was already gone. */
export const SIGNAL_OUTCOMES = ["signalled", "gone"] as const;
export type SignalOutcome = (typeof SIGNAL_OUTCOMES)[number];

/** The kinds of state a host link is in. `idle`: no dial yet this orchd run. `connecting`:
 *  dialing. `synchronizing`: the host answered, and this orchd is catching up on its agents
 *  there. `up`: in step. `backoff`: the last dial failed or the link dropped, and a redial
 *  is due. `down`: ended and not wanted. `blocked`: refused in a way a redial cannot fix,
 *  so it waits for a person. */
export const HOST_LINK_STATES = ["idle", "connecting", "synchronizing", "up", "backoff", "down", "blocked"] as const;
export type HostLinkStateKind = (typeof HOST_LINK_STATES)[number];

/** A host whose link is down, as a status row reports it: when it last answered, null when
 *  orch never reached it. */
export interface HostOffline {
  readonly lastSeen: number | null;
}

/** One configured host's link, as orchd reports it. */
export interface HostLinkView {
  readonly name: string;
  readonly dest: string;
  readonly state: HostLinkStateKind;
  /** The id this name is bound to; null until the host first answered. */
  readonly hostId: HostId | null;
  readonly greeting: HostGreeting | null;
  readonly reason: string | null;
  /** When the far side last answered, over any link this or an earlier orchd held. */
  readonly lastSeen: number | null;
  /** When the next dial is due, while the link is in backoff; null otherwise. */
  readonly retryAt: number | null;
  /** Which dial since the link was last up this is, from 1, while it dials, synchronizes or
   *  waits to redial; null otherwise. */
  readonly attempt: number | null;
}
