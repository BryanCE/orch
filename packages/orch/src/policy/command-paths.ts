// A command in settings names no directory of its own: `{cwd}` and `{wincwd}` stand for
// the directory of the agent that runs it, filled in per agent. A fixed path in a
// command would send every agent on the machine into one project, so it is refused.

export const CWD_TOKEN = "{cwd}";
export const WINCWD_TOKEN = "{wincwd}";

const FIXED_PATH = /(?:^|[\s"'=;(,])(?:[A-Za-z]:[\\/]|\\\\|~[\\/]|\/[\w.-]+\/)/;

/** Whether a settings command carries an absolute path instead of `{cwd}` / `{wincwd}`. */
export function hasFixedPath(command: string): boolean {
  return FIXED_PATH.test(command);
}

export const FIXED_PATH_MESSAGE =
  `a command names no fixed directory; write ${CWD_TOKEN} (or ${WINCWD_TOKEN} for a Windows tool) and orch fills in each agent's own directory`;

/** The Windows form of a directory: a WSL drive mount becomes its drive, any other WSL path its UNC share. */
export function windowsPath(directory: string, distro: string | undefined): string {
  const mount = /^\/mnt\/([A-Za-z])(\/.*)?$/.exec(directory);
  if (mount) return `${mount[1]!.toUpperCase()}:${(mount[2] ?? "\\").replaceAll("/", "\\")}`;
  if (directory.startsWith("/") && distro) return `\\\\wsl.localhost\\${distro}${directory.replaceAll("/", "\\")}`;
  return directory;
}

/** The command with `{cwd}` and `{wincwd}` replaced by the agent's directory. */
export function commandIn(command: string, cwd: string, distro: string | undefined): string {
  return command.replaceAll(CWD_TOKEN, cwd).replaceAll(WINCWD_TOKEN, windowsPath(cwd, distro));
}
