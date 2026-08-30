import * as path from "node:path";
import type { ExtensionName } from "../types/core.ts";

/** Source directory per shipped extension. Bundle output names are stable harness artifacts. */
export const EXTENSION_SOURCE_DIR = {
  "pi-bridge": "pi",
  "omp-bridge": "omp",
} as const;

/** Basenames of the extensions shipped as prebuilt ESM bundles. */
export const EXTENSION_NAMES = ["pi-bridge", "omp-bridge"] as const;

/** Resolve a shipped bundle in the package checkout or installed package. */
export function extensionBundlePath(root: string, name: ExtensionName): string {
  return path.join(root, "dist", "extensions", `${name}.js`);
}
