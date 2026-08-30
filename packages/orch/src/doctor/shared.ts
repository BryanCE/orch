import * as filesystem from "node:fs";
import { execFile } from "node:child_process";
import * as os from "node:os";
import { isRecord, errorMessage } from "../util.ts";

export function readJson(file: string): unknown {
  return JSON.parse(filesystem.readFileSync(file, "utf8"));
}

export function commandOutput(command: string, args: string[]): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    execFile(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      const codeValue = isRecord(error) ? error.code : undefined;
      if (error && typeof codeValue !== "number") {
        resolve({ ok: false, output: errorMessage(error) });
        return;
      }
      const code = typeof codeValue === "number" ? codeValue : 0;
      resolve({ ok: code === 0, output: (stdout || stderr).trim() });
    });
  });
}

export function isWslRuntime(): boolean {
  if (process.env.WSL_DISTRO_NAME) return true;
  return /microsoft|wsl/i.test(os.release());
}
