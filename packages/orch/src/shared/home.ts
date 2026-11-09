import { homedir } from "node:os";

/** The home folder, read at call time: $HOME first, else the account's. Every path orch resolves
 *  under a home goes through this, so a caller that redirects HOME, a test's sandbox included,
 *  gets the redirect. Bun's os.homedir() reads passwd and ignores HOME. */
export function homeDir(): string {
  return process.env.HOME ?? homedir();
}
