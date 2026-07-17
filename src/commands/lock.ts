import { spawnSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config.ts";
import { orchDir } from "../store.ts";
import { acquireCommandLock, matchesLockedCommand, readCommandLock, releaseCommandLock, type CommandLock } from "../cmd-lock.ts";

function holderName(): string {
  return process.env.ORCH_AGENT_KEY ?? `user:${process.pid}`;
}

function numberOption(args: string[], name: string, index: number): number | undefined {
  const value = args[index + 1];
  if (value === undefined || !/^\d+$/.test(value)) throw new Error(`${name} requires a millisecond value`);
  return Number(value);
}

function age(lock: CommandLock): number {
  return Math.max(0, Date.now() - lock.ts);
}

function printStatus(json: boolean, directory: string): void {
  const lock = readCommandLock(directory);
  if (json) {
    process.stdout.write(JSON.stringify(lock ? { ...lock, ageMs: age(lock) } : null) + "\n");
    return;
  }
  process.stdout.write(lock ? `locked: ${lock.holder} (pid ${lock.pid}, age ${age(lock)}ms)\n` : "unlocked\n");
}

function checkLocked(args: string[], directory: string): number {
  const separator = args.indexOf("--");
  if (separator < 0 || separator !== 0 || separator === args.length - 1) throw new Error("usage: orch lock check -- <argv...>");
  const command = args.slice(separator + 1);
  const pattern = loadConfig(directory).locked_commands.find((candidate) => matchesLockedCommand(command, [candidate]));
  if (pattern === undefined) return 0;
  process.stdout.write(`${pattern}\n`);
  return 3;
}

function forceRelease(directory: string): void {
  const lock = readCommandLock(directory);
  if (!lock) {
    process.stdout.write("unlocked\n");
    return;
  }
  try {
    unlinkSync(join(directory, "cmd-lock.json"));
    process.stdout.write(`evicted ${lock.holder} (pid ${lock.pid})\n`);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      process.stdout.write("unlocked\n");
      return;
    }
    throw error;
  }
}

async function runLocked(args: string[], directory: string): Promise<number> {
  const separator = args.indexOf("--");
  if (separator < 0 || separator === args.length - 1) throw new Error("usage: orch lock run [--note <why>] [--timeout <ms>] -- <argv...>");
  let note: string | undefined;
  let timeoutMs: number | undefined;
  for (let i = 0; i < separator; i++) {
    if (args[i] === "--note") {
      note = args[++i];
      if (note === undefined) throw new Error("--note requires text");
    } else if (args[i] === "--timeout") {
      timeoutMs = numberOption(args, "--timeout", i++);
    } else {
      throw new Error(`unknown lock run option: ${args[i]}`);
    }
  }
  const lock = await acquireCommandLock(directory, { holder: holderName(), note, timeoutMs });
  let childPid: number | undefined;
  const stopChild = () => {
    if (childPid) {
      try { process.kill(childPid, "SIGTERM"); } catch {}
    }
  };
  process.once("SIGINT", stopChild);
  process.once("SIGTERM", stopChild);
  try {
    const command = args[separator + 1];
    if (command === undefined) throw new Error("usage: orch lock run [--note <why>] [--timeout <ms>] -- <argv...>");
    const result = spawnSync(command, args.slice(separator + 2), { stdio: "inherit" });
    childPid = result.pid;
    const exitCode = result.status ?? 1;
    return exitCode;
  } finally {
    process.off("SIGINT", stopChild);
    process.off("SIGTERM", stopChild);
    releaseCommandLock(directory, lock.pid);
  }
}

export async function cmdLock(args: string[]): Promise<number> {
  const subcommand = args[0];
  const directory = orchDir();
  if (subcommand === "run") {
    return await runLocked(args.slice(1), directory);
  }
  if (subcommand === "status") {
    printStatus(args.includes("--json"), directory);
    return 0;
  }
  if (subcommand === "check") return checkLocked(args.slice(1), directory);
  if (subcommand === "release" && args.slice(1).length === 1 && args[1] === "--force") {
    forceRelease(directory);
    return 0;
  }
  throw new Error("usage: orch lock run [--note <why>] [--timeout <ms>] -- <argv...> | status [--json] | release --force");
}
