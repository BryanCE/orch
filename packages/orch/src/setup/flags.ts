import { die } from "../commands/target.ts";

/** Read the value following `name` in `args`, or undefined when the flag is absent. */
export function readValueFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

/** Read a flag written as `--name value` or `--name=value`. */
export function readAssignFlag(args: string[], name: string): string | undefined {
  const assigned = args.find((arg) => arg.startsWith(`${name}=`));
  if (assigned !== undefined) return assigned.slice(name.length + 1);
  return readValueFlag(args, name);
}

/** Read every repeatable --model value, accepting both `--model value` and `--model=value`. */
export function readModelFlags(args: string[]): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) continue;
    if (arg === "--model") {
      const value = args[index + 1];
      if (value !== undefined) {
        values.push(value);
        index += 1;
      }
    } else if (arg.startsWith("--model=")) {
      values.push(arg.slice("--model=".length));
    }
  }
  return values;
}

/** Validate a provided setup flag value against the supported ids, or exit. */
/** Narrow one flag value to the closed provider set, or exit naming every supported id. */
export function validateSetupFlag<Id extends string>(kind: string, value: string, supported: readonly Id[]): Id {
  const known = supported.find((id) => id === value);
  if (known !== undefined) return known;
  die(`Unknown ${kind} "${value}". Supported ${kind}s: ${supported.join(", ")}.`);
}

export class SetupFlagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupFlagError";
  }
}

export interface SetupOptions {
  copy: boolean;
  yes: boolean;
  noInstall: boolean;
  interactive: boolean;
  runtimeFlag: string | undefined;
  adapterFlag: string | undefined;
  backendFlag: string | undefined;
  modelFlags: string[];
  refresh: boolean;
  noSmoke: boolean;
}

export function parseSetupOptions(args: string[]): SetupOptions {
  const yes = args.includes("--yes") || args.includes("-y");
  return {
    copy: args.includes("--copy"),
    yes,
    noInstall: args.includes("--no-install"),
    interactive: process.stdin.isTTY && !yes,
    runtimeFlag: readAssignFlag(args, "--runtime"),
    adapterFlag: readAssignFlag(args, "--agent") ?? readAssignFlag(args, "--adapter") ?? readAssignFlag(args, "--harness"),
    backendFlag: readAssignFlag(args, "--backend") ?? readAssignFlag(args, "--plexer"),
    modelFlags: readModelFlags(args),
    refresh: args.includes("--refresh"),
    noSmoke: args.includes("--no-smoke"),
  };
}
