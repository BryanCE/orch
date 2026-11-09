import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeShebangRuntime } from "../src/doctor/runtime.ts";
import { BUILD_COMMIT_SLOT, DIRTY_SUFFIX } from "../src/build-stamp.ts";

// The npm artifact must be deterministic and runnable by every npm user. Runtime
// selection is applied after install by `orch setup`; it must never leak a
// publisher's local settings into the packaged entrypoint.
export const BUILD_RUNTIME = "node";

/** bun's marker for "I emitted this", written when the source shebang names bun. A bun
 * runtime decodes a file carrying it as Latin-1, double-encoding every non-ASCII literal,
 * so a shipped entrypoint must never carry it whichever runtime a user later picks. */
const BUN_PRAGMA = /^\/\/ @bun\r?\n/m;

export function stampBuildEntrypoint(output: string): void {
  const source = readFileSync(output, "utf8");
  if (BUN_PRAGMA.test(source)) writeFileSync(output, source.replace(BUN_PRAGMA, ""));
  writeShebangRuntime(output, BUILD_RUNTIME);
}

/** Every packaged entrypoint. Each is stamped, so a bin cannot ship with bun's shebang. */
export const BUILD_ENTRYPOINTS: readonly string[] = ["dist/bin/orch.js", "dist/bin/orch-ding.js"];

/** The entrypoint that answers a host link, and so carries the build commit. */
const STAMPED_ENTRYPOINT = "dist/bin/orch.js";

const PACKAGE_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** The commit the checkout is on, `-dirty` when it has uncommitted changes; null outside a
 *  git checkout, such as a build from a published tarball. */
export function checkoutCommit(): string | null {
  try {
    const git = (args: string[]): string => execFileSync("git", args, { cwd: PACKAGE_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const commit = git(["rev-parse", "--short", "HEAD"]);
    return git(["status", "--porcelain", "--untracked-files=no"]) === "" ? commit : `${commit}${DIRTY_SUFFIX}`;
  } catch {
    return null;
  }
}

/** Write the build commit over its slot in a built bundle. A bundle with no slot is a
 *  build that lost the stamp, which fails here rather than ship without one. */
export function stampBuildCommit(output: string, commit: string): void {
  const bundle = readFileSync(output, "utf8");
  if (!bundle.includes(BUILD_COMMIT_SLOT)) throw new Error(`${output} has no ${BUILD_COMMIT_SLOT} to stamp`);
  writeFileSync(output, bundle.replaceAll(BUILD_COMMIT_SLOT, commit));
}

if (import.meta.main) {
  for (const output of BUILD_ENTRYPOINTS) {
    stampBuildEntrypoint(output);
    process.stdout.write(`build-bin: ${output} runs under ${BUILD_RUNTIME}\n`);
  }
  const commit = checkoutCommit();
  if (commit !== null) stampBuildCommit(STAMPED_ENTRYPOINT, commit);
  process.stdout.write(`build-bin: ${STAMPED_ENTRYPOINT} built from ${commit ?? "no git commit"}\n`);
}
