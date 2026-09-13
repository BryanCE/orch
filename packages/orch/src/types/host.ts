/** The operating systems orch can be installed on. WSL is not a fourth OS: a WSL
 *  process is a Linux process for pids, sockets and paths, and what WSL adds is a
 *  reachable Windows disk, which is the `wsl` flag on {@link Host}. */
export const HOST_OS_VALUES = ["linux", "windows", "darwin"] as const;
export type HostOs = (typeof HOST_OS_VALUES)[number];
/** What this process runs on, resolved once at a composition root. */
export interface Host { readonly os: HostOs; readonly wsl: boolean; }
