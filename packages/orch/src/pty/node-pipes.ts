import { spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import type { PipesExit, PipesProvider } from "../types/pipes.ts";

/** Runs programs with Node-compatible piped standard streams. */
export const nodePipes: PipesProvider = {
  spawn(request) {
    const [file, ...args] = request.argv;
    if (file === undefined) throw new Error("a pipes program needs an executable");
    const child = spawn(file, args, {
      cwd: request.cwd,
      env: { ...request.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const listeners = new Set<(text: string) => void>();
    function emitStderr(text: string): void {
      for (const listener of listeners) listener(text);
    }
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", emitStderr);
    child.stderr.on("error", (error) => { emitStderr(error.message); });
    const exited = new Promise<PipesExit>((resolve) => {
      child.on("exit", (code, signal) => { resolve({ code, signal }); });
      child.on("error", (error) => {
        emitStderr(error.message);
      });
    });
    if (child.pid === undefined) throw new Error(`could not start ${file} in ${request.cwd}`);
    return {
      pid: child.pid,
      input: Writable.toWeb(child.stdin),
      output: Readable.toWeb(child.stdout),
      onStderr(listener) { listeners.add(listener); },
      exited,
      kill() { child.kill(); },
    };
  },
};
