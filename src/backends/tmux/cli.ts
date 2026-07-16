import { execFileSync } from "node:child_process";

interface ExecOptions {
  readonly encoding: "utf8";
  readonly timeout: number;
  readonly stdio: ["ignore", "pipe", "pipe"];
}

function runTmux(args: string[]): string {
  const options: ExecOptions = {
    encoding: "utf8",
    timeout: 5000,
    stdio: ["ignore", "pipe", "pipe"],
  };
  return execFileSync("tmux", args, options);
}

export function bestEffortTmux(args: string[]): string | null {
  try {
    return runTmux(args);
  } catch {
    return null;
  }
}
