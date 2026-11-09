// Which commit a packaged orch was built from. scripts/build-bin.ts writes the short commit
// id over the slot below in the built bundle. Run from source, the slot is still there and
// there is no commit.

/** The text the build replaces in the bundle. Nothing else may spell it. */
export const BUILD_COMMIT_SLOT = "@ORCH_BUILD_COMMIT@";

const COMMIT = /^[0-9a-f]+$/;

/** The commit this build was made from; null when orch runs from source or the build had none. */
export function buildCommit(): string | null {
  const stamped: string = BUILD_COMMIT_SLOT;
  return COMMIT.test(stamped) ? stamped : null;
}
