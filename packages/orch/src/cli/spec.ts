/** The one table a command declares its flags in. The parser and `orch help` both read it. */

/** How many values a flag takes: none (`--json`), one (`--tab api`), or many (`--file a --file b`). */
export type FlagArity = "none" | "one" | "many";

export interface FlagSpec {
  /** The long form, with dashes: `--json`. */
  readonly name: string;
  /** Other spellings, with their dashes: `-y`, or `--adapter` for `--agent`. */
  readonly aliases?: readonly string[];
  readonly arity: FlagArity;
  /** Shown after the name in usage and the flag table: `<label>`. Required when the flag takes a value. */
  readonly placeholder?: string;
  /** One line. */
  readonly help: string;
}

export type HelpSection = "observe" | "dispatch" | "collect" | "queue" | "review" | "agents" | "tabs" | "maintenance";

export interface CommandSpec {
  readonly name: string;
  readonly aliases?: readonly string[];
  /** The block of the `orch help` map this command prints in. A subcommand has none. */
  readonly section?: HelpSection;
  /** The synopsis line: `orch spawn <name>... [--tab <label>]`. */
  readonly usage: string;
  /** The one line the `orch help` map prints. */
  readonly summary: string;
  readonly flags: readonly FlagSpec[];
  readonly subcommands?: readonly CommandSpec[];
  /** A flag the spec does not declare is kept, not refused. `settings notify add` takes the sink's own fields. */
  readonly openFlags?: true;
}

export interface ParsedFlags {
  /** True when a no-value flag was given. */
  has(name: string): boolean;
  /** The value of a one-value flag, or undefined when it was not given. */
  value(name: string): string | undefined;
  /** Every value of a many-value flag, in argv order. Empty when it was not given. */
  values(name: string): readonly string[];
}

export interface Invocation {
  /** The spec that matched, a subcommand's when one did. */
  readonly command: CommandSpec;
  /** The command words that led here: `["settings", "notify", "add"]`. */
  readonly path: readonly string[];
  readonly flags: ParsedFlags;
  readonly positional: readonly string[];
  /** Flags the spec did not declare, kept only under `openFlags`. A bare flag maps to `true`. */
  readonly undeclared: ReadonlyMap<string, string | true>;
}

/** An argv the spec refuses. The message names the fix. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}
