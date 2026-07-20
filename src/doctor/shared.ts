import * as filesystem from "node:fs";
import { execFile } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { packageRoot } from "../util.ts";

/** Checkout/package root used to locate bundled scripts and the daemon entrypoint. */
export const repoDir = packageRoot();

export function onPath(command: string): boolean {
  const extensions = process.platform === "win32" ? ["", ".exe", ".cmd", ".bat"] : [""];
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    for (const extension of extensions) {
      try {
        filesystem.accessSync(path.join(directory, command + extension), filesystem.constants.X_OK);
        return true;
      } catch {}
    }
  }
  return false;
}

export function hasErrorCode(error: unknown, code: string): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return error.code === code;
}

export function readJson(file: string): unknown {
  return JSON.parse(filesystem.readFileSync(file, "utf8"));
}

export function commandOutput(command: string, args: string[]): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      const err = error as (NodeJS.ErrnoException & { code?: number | string }) | null;
      if (err && typeof err.code !== "number") {
        resolve({ ok: false, output: err.message });
        return;
      }
      const code = err && typeof err.code === "number" ? err.code : 0;
      resolve({ ok: code === 0, output: (stdout || stderr).trim() });
    });
  });
}

export function isWslRuntime(): boolean {
  if (process.env.WSL_DISTRO_NAME) return true;
  return /microsoft|wsl/i.test(os.release());
}

export function readAgentEntries(orchDir: string): filesystem.Dirent[] | undefined {
  try {
    return filesystem.readdirSync(path.join(orchDir, "agents"), { withFileTypes: true });
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) return undefined;
    throw error;
  }
}
