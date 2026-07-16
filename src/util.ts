import { accessSync, constants, existsSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Absolute path of the package root — the directory holding package.json.
 * Walks up from this module's own location so it resolves correctly whether orch
 * runs from live source (`src/util.ts` → repo root) or the bundled entrypoint
 * (`dist/bin/orch.js` → repo root in dev, `node_modules/orch` when published).
 * A hardcoded "two levels up from the entry file" breaks the moment the entry
 * moves from `bin/` to `dist/bin/`.
 */
export function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 16; i++) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`packageRoot: no package.json found above ${fileURLToPath(import.meta.url)}`);
}

/** True when an executable named `bin` is found on PATH (node-compatible). */
export function binaryOnPath(bin: string): boolean {
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const exts = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      try {
        accessSync(join(dir, bin + ext), constants.X_OK);
        return true;
      } catch {}
    }
  }
  return false;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
