import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// herdr's extension loader wants plain bundled ESM, not TypeScript source with
// relative ../src imports (those resolve against the ~/.pi symlink location and
// break outside a checkout). So every shipped pi extension is bundled to dist/ —
// prebuilt in the npm tarball (see package.json prepublishOnly), and built on
// demand from a git clone by `orch setup` / `orch doctor --fix`.

/** Basenames of the pi extensions shipped as prebuilt ESM bundles. The bridge is
 * the single pi extension; it carries all orch and herdr pane integration. */
export const PI_EXTENSION_NAMES = ["orchestrator-bridge"] as const;

export type PiExtensionName = (typeof PI_EXTENSION_NAMES)[number];

function extensionSourcePath(root: string, name: PiExtensionName): string {
  return path.join(root, "extensions", `${name}.ts`);
}

export function extensionBundlePath(root: string, name: PiExtensionName): string {
  return path.join(root, "dist", "extensions", `${name}.js`);
}

/** Bundle one pi extension into dist/. Returns the bundle path. */
export function buildExtensionBundle(root: string, name: PiExtensionName): string {
  const source = extensionSourcePath(root, name);
  const bundle = extensionBundlePath(root, name);
  fs.mkdirSync(path.dirname(bundle), { recursive: true });
  execFileSync("bun", ["build", source, "--target=node", "--format=esm", "--outfile", bundle], { stdio: "inherit" });
  return bundle;
}
