import * as path from "node:path";

/** Source directory per shipped extension. Bundle output names are stable harness artifacts. */
const EXTENSION_SOURCE_DIR = {
  "pi-bridge": "pi",
  "omp-bridge": "omp",
} as const;

/** Basenames of the extensions shipped as prebuilt ESM bundles. */
export const EXTENSION_NAMES = Object.keys(EXTENSION_SOURCE_DIR) as readonly ExtensionName[];

/** Bundle names orch no longer ships. A leftover link is reaped on install. */
export const RETIRED_EXTENSION_NAMES = ["orchestrator-bridge"] as const;

export type ExtensionName = keyof typeof EXTENSION_SOURCE_DIR;

/** Resolve a shipped bundle in the package checkout or installed package. */
export function extensionBundlePath(root: string, name: ExtensionName): string {
  return path.join(root, "dist", "extensions", `${name}.js`);
}
