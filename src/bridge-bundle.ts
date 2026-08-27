import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { binaryOnPath } from "./util.ts";

// A harness's extension loader wants plain bundled ESM, not TypeScript source with
// relative ../src imports (those resolve against the symlink location in the
// harness's config dir and break outside a checkout). So every shipped extension
// is bundled to dist/ — prebuilt in the npm tarball (see package.json
// prepublishOnly), and built on demand from a git clone by `orch setup` /
// `orch doctor --fix`.

/** Source directory per shipped extension: each harness owns extensions/<harness>/.
 * The bundle OUTPUT name is unrelated to the directory — it stays the name the
 * harness's loader and doctor's staleness check already know, so renaming a source
 * directory never renames a shipped artifact an installed tree knows about. */
const EXTENSION_SOURCE_DIR = {
  "pi-bridge": "pi",
  "omp-bridge": "omp",
} as const;

/** Basenames of the extensions shipped as prebuilt ESM bundles. */
export const EXTENSION_NAMES = Object.keys(EXTENSION_SOURCE_DIR) as readonly ExtensionName[];

/** Bundle names orch no longer ships. A leftover link is no longer recognized as
 *  orch's, so the adapter hands it to the harness as one of the user's own
 *  extensions — pointing at a path that no longer exists, which makes the harness
 *  refuse to start. Every install reaps them. */
export const RETIRED_EXTENSION_NAMES = ["orchestrator-bridge"] as const;

export type ExtensionName = keyof typeof EXTENSION_SOURCE_DIR;

function extensionSourcePath(root: string, name: ExtensionName): string {
  return path.join(root, "extensions", EXTENSION_SOURCE_DIR[name], "index.ts");
}

export function extensionBundlePath(root: string, name: ExtensionName): string {
  return path.join(root, "dist", "extensions", `${name}.js`);
}

/** Bundle one extension into dist/. Returns the bundle path.
 *
 * Bundling is build tooling, so it needs a bundler on PATH — the one path in orch
 * that does. The shipped tarball carries prebuilt bundles and never reaches here;
 * only a git clone does. Say so plainly instead of surfacing a raw ENOENT. */
export function buildExtensionBundle(root: string, name: ExtensionName): string {
  if (!binaryOnPath("bun")) {
    throw new Error(`cannot build the ${name} bundle: bun is not on PATH. Install from the npm package, which ships dist/extensions/${name}.js prebuilt, or install bun to build from this checkout.`);
  }
  const source = extensionSourcePath(root, name);
  const bundle = extensionBundlePath(root, name);
  fs.mkdirSync(path.dirname(bundle), { recursive: true });
  execFileSync("bun", ["build", source, "--target=node", "--format=esm", "--outfile", bundle], { stdio: "inherit" });
  return bundle;
}
