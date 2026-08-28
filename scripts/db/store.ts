import { homedir } from "node:os";
import { join } from "node:path";

/** The store every `bun db:*` command acts on: the real one, so development runs
 *  against the same file a published install would.
 *
 *  That only holds while every shell agrees which file it is. `homedir()` is a
 *  property of the process, not the checkout, so the same command run from
 *  Windows resolves `C:\Users\...\.orch` while orch itself runs against
 *  `/home/...` - and drizzle-kit builds a second real database nobody reads.
 *  There is no path that means both, so the wrong side is refused rather than
 *  quietly served. */
export function targetStoreDir(): string {
  return process.env.ORCH_DIR ?? join(homedir(), ".orch");
}

/** orch runs under WSL on this machine, so its store is a Linux path. Naming
 *  ORCH_DIR is the deliberate override - it says which store you mean, and it is
 *  then yours to point at one this OS can safely open. */
export function assertHostOwnsStore(command: string): void {
  if (process.platform !== "win32" || process.env.ORCH_DIR) return;
  process.stderr.write(
    `${command}: orch's store lives in WSL (${join("/home", "<you>", ".orch")}), and Windows resolves ~ to ${homedir()}.\n`
    + `Running here would build a second database orch never reads. Re-run this from WSL.\n`,
  );
  process.exit(1);
}
