import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// herdr's extension loader wants plain bundled ESM, not the TypeScript source that
// `bin/orch.ts` runs directly under bun. So the bridge extension is bundled to
// dist/ — shipped prebuilt in the npm tarball (see package.json prepublishOnly),
// and built on demand from a git clone by `orch setup` / `orch doctor --fix`.

function bridgeSourcePath(root: string): string {
  return path.join(root, "extensions", "orchestrator-bridge.ts");
}

export function bridgeBundlePath(root: string): string {
  return path.join(root, "dist", "extensions", "orchestrator-bridge.js");
}

/** Bundle the orchestrator bridge extension into dist/. Returns the bundle path. */
export function buildBridgeBundle(root: string): string {
  const source = bridgeSourcePath(root);
  const bundle = bridgeBundlePath(root);
  fs.mkdirSync(path.dirname(bundle), { recursive: true });
  execFileSync("bun", ["build", source, "--target=node", "--format=esm", "--outfile", bundle], { stdio: "inherit" });
  return bundle;
}
