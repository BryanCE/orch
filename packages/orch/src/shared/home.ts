import { homedir } from "node:os";
import * as path from "node:path";

/** The home folder, read at call time: $HOME first, else the account's. Every path orch resolves
 *  under a home goes through this, so a caller that redirects HOME, a test's sandbox included,
 *  gets the redirect. Bun's os.homedir() reads passwd and ignores HOME. */
export function homeDir(): string {
  return process.env.HOME ?? homedir();
}

/** A configured path with a leading `~` read as the home folder. Any other path comes back as it is. */
export function expandHome(configured: string): string {
  if (configured === "~") return homeDir();
  return configured.startsWith("~/") ? path.join(homeDir(), configured.slice(2)) : configured;
}
