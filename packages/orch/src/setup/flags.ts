import { die } from "../commands/target.ts";
import type { ParsedFlags } from "../cli/spec.ts";

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
  /** `--install` is true, `--no-install` is false, neither leaves it to the prompt, or reports only. */
  install: boolean | undefined;
  interactive: boolean;
  runtimeFlag: string | undefined;
  adapterFlag: string | undefined;
  backendFlag: string | undefined;
  modelFlags: string[];
  refresh: boolean;
  /** `--skills` is true, `--no-skills` is false, neither leaves it to the prompt or the record. */
  skills: boolean | undefined;
  /** Opt-in: the smoke spawns a real agent and spends real tokens. */
  smoke: boolean;
}

export function parseSetupOptions(flags: ParsedFlags): SetupOptions {
  return {
    copy: flags.has("--copy"),
    install: flags.has("--install") ? true : flags.has("--no-install") ? false : undefined,
    interactive: process.stdin.isTTY === true && !flags.has("--yes"),
    runtimeFlag: flags.value("--runtime"),
    adapterFlag: flags.value("--harness"),
    backendFlag: flags.value("--plexer"),
    modelFlags: [...flags.values("--model")],
    refresh: flags.has("--refresh"),
    skills: flags.has("--skills") ? true : flags.has("--no-skills") ? false : undefined,
    smoke: flags.has("--smoke"),
  };
}
