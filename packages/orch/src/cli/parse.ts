import { UsageError } from "./spec.ts";
import type { CommandSpec, FlagSpec, Invocation, ParsedFlags } from "./spec.ts";

type FlagStore = Map<string, true | string | string[]>;

const FLAG_TOKEN = /^--?[a-zA-Z]/;

function isFlagToken(token: string): boolean {
  return FLAG_TOKEN.test(token);
}

/** `--tab=api` splits into the name and the assigned value; `--tab` has no assignment. */
function splitAssignment(token: string): { readonly name: string; readonly assigned: string | undefined } {
  const at = token.indexOf("=");
  if (at < 0) return { name: token, assigned: undefined };
  return { name: token.slice(0, at), assigned: token.slice(at + 1) };
}

function findFlag(declared: readonly FlagSpec[], name: string): FlagSpec | undefined {
  return declared.find((flag) => flag.name === name || flag.aliases?.includes(name));
}

function findSubcommand(spec: CommandSpec, word: string | undefined): CommandSpec | undefined {
  if (word === undefined || spec.subcommands === undefined) return undefined;
  return spec.subcommands.find((child) => child.name === word || child.aliases?.includes(word));
}

/** The value a one- or many-value flag takes: the assignment, else the next token. */
function takeValue(flag: FlagSpec, assigned: string | undefined, argv: readonly string[], index: number, usage: string): { readonly value: string; readonly consumed: number } {
  if (assigned !== undefined) return { value: assigned, consumed: 0 };
  const next = argv[index + 1];
  if (next === undefined) throw new UsageError(`${flag.name} needs a value ${flag.placeholder ?? ""}\nusage: ${usage}`.trimEnd());
  return { value: next, consumed: 1 };
}

function recordDeclared(store: FlagStore, flag: FlagSpec, assigned: string | undefined, argv: readonly string[], index: number, usage: string): number {
  if (flag.arity === "none") {
    if (assigned !== undefined) throw new UsageError(`${flag.name} takes no value\nusage: ${usage}`);
    store.set(flag.name, true);
    return 0;
  }
  const taken = takeValue(flag, assigned, argv, index, usage);
  if (flag.arity === "one") {
    store.set(flag.name, taken.value);
    return taken.consumed;
  }
  const values = store.get(flag.name);
  if (Array.isArray(values)) values.push(taken.value);
  else store.set(flag.name, [taken.value]);
  return taken.consumed;
}

/** An undeclared flag under `openFlags`: `--key=value`, `--key value` when the next token is not a flag, else bare. */
function recordUndeclared(undeclared: Map<string, string | true>, name: string, assigned: string | undefined, argv: readonly string[], index: number): number {
  if (assigned !== undefined) {
    undeclared.set(name, assigned);
    return 0;
  }
  const next = argv[index + 1];
  if (next !== undefined && !isFlagToken(next)) {
    undeclared.set(name, next);
    return 1;
  }
  undeclared.set(name, true);
  return 0;
}

function parsedFlags(store: FlagStore): ParsedFlags {
  return {
    has: (name) => store.get(name) === true,
    value: (name) => {
      const held = store.get(name);
      return typeof held === "string" ? held : undefined;
    },
    values: (name) => {
      const held = store.get(name);
      return Array.isArray(held) ? held : [];
    },
  };
}

function readFlags(spec: CommandSpec, declared: readonly FlagSpec[], argv: readonly string[]): Omit<Invocation, "command" | "path"> {
  const store: FlagStore = new Map();
  const undeclared = new Map<string, string | true>();
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!isFlagToken(token)) {
      positional.push(token);
      continue;
    }
    const { name, assigned } = splitAssignment(token);
    const flag = findFlag(declared, name);
    if (flag !== undefined) index += recordDeclared(store, flag, assigned, argv, index, spec.usage);
    else if (spec.openFlags) index += recordUndeclared(undeclared, name, assigned, argv, index);
    else throw new UsageError(`unknown flag ${name}\nusage: ${spec.usage}`);
  }
  return { flags: parsedFlags(store), positional, undeclared };
}

/**
 * Parse one command's argv against its spec. A leading word that names a subcommand
 * routes to that child. `globals` are accepted on every command.
 */
export function parseInvocation(spec: CommandSpec, argv: readonly string[], globals: readonly FlagSpec[] = []): Invocation {
  const child = findSubcommand(spec, argv[0]);
  if (child !== undefined) {
    const inner = parseInvocation(child, argv.slice(1), globals);
    return { ...inner, path: [spec.name, ...inner.path] };
  }
  const read = readFlags(spec, [...spec.flags, ...globals], argv);
  return { command: spec, path: [spec.name], ...read };
}
