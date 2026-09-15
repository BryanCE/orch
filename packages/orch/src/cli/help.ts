import type { CommandSpec, FlagSpec, HelpSection } from "./spec.ts";
import type { HelpDoc } from "./doc.ts";

export const HELP_HEADER = "orch - the single controller for coding agents, in any plexer.";
const HELP_POINTER = "'orch help <command>' (or 'orch <command> -h') prints usage, doctrine, and every flag.";
const HELP_FOOTER = "Target: agent name, identity key, or unique handle suffix. Tabs resolve by id or unique label.";

const SECTION_TITLES: Record<HelpSection, string> = {
  observe: "OBSERVE",
  dispatch: "DISPATCH",
  collect: "COLLECT",
  queue: "QUEUE",
  review: "REVIEW",
  agents: "AGENTS (never steals focus except 'focus')",
  tabs: "TABS AND SPACES",
  maintenance: "MAINTENANCE",
};
const SECTION_ORDER: readonly HelpSection[] = ["observe", "dispatch", "collect", "queue", "review", "agents", "tabs", "maintenance"];

const MAP_COLUMN = 48;
const FLAG_COLUMN = 28;

/** A usage that fits shares its line with the summary; a long one puts the summary beneath it. */
function mapLine(spec: CommandSpec): string {
  const usage = `  ${spec.usage}`;
  if (usage.length < MAP_COLUMN) return `${usage.padEnd(MAP_COLUMN)}${spec.summary}\n`;
  return `${usage}\n${" ".repeat(MAP_COLUMN)}${spec.summary}\n`;
}

function mapSection(section: HelpSection, commands: readonly CommandSpec[]): string {
  const rows = commands.filter((spec) => spec.section === section).map(mapLine).join("");
  return `${SECTION_TITLES[section]}\n${rows}\n`;
}

/** The `orch help` map: every top-level command under its section. */
export function renderMap(commands: readonly CommandSpec[]): string {
  const sections = SECTION_ORDER.map((section) => mapSection(section, commands)).join("");
  return `${HELP_HEADER}\n${HELP_POINTER}\n\n${sections}${HELP_FOOTER}\n`;
}

/** `-y, --yes <value>`: short spellings first, then the name, then long aliases. */
function flagSpellings(flag: FlagSpec): string {
  const aliases = flag.aliases ?? [];
  const short = aliases.filter((alias) => !alias.startsWith("--"));
  const long = aliases.filter((alias) => alias.startsWith("--"));
  const names = [...short, flag.name, ...long].join(", ");
  if (flag.arity === "none") return names;
  const repeat = flag.arity === "many" ? "..." : "";
  return `${names} ${flag.placeholder ?? ""}${repeat}`;
}

function flagRow(flag: FlagSpec, indent: string): string {
  const spellings = `${indent}${flagSpellings(flag)}`;
  if (spellings.length < FLAG_COLUMN) return `${spellings.padEnd(FLAG_COLUMN)}${flag.help}\n`;
  return `${spellings}\n${" ".repeat(FLAG_COLUMN)}${flag.help}\n`;
}

function flagRows(flags: readonly FlagSpec[], indent: string): string {
  return flags.map((flag) => flagRow(flag, indent)).join("");
}

function flagTable(title: string, flags: readonly FlagSpec[]): string {
  if (flags.length === 0) return "";
  return `${title}\n${flagRows(flags, "  ")}`;
}

/** A subcommand's usage, summary, and flags; its own subcommands nest one level deeper. */
function subcommandBlock(child: CommandSpec, indent: string): string {
  const nested = (child.subcommands ?? []).map((grandchild) => subcommandBlock(grandchild, `${indent}  `)).join("");
  return `${indent}${child.usage}\n${indent}    ${child.summary}\n${flagRows(child.flags, `${indent}    `)}${nested}`;
}

function docBlock(doc: HelpDoc): string {
  if ("text" in doc) return `${doc.text}\n`;
  return `(no doctrine: ${doc.missing} is missing; 'orch doctor' reports it)\n`;
}

function subcommandTable(subcommands: readonly CommandSpec[]): string {
  if (subcommands.length === 0) return "";
  return `Subcommands:\n${subcommands.map((child) => subcommandBlock(child, "  ")).join("\n")}`;
}

/** One command's help: usage, its doc, its flags, each subcommand, then the global flags. */
export function renderTopic(spec: CommandSpec, doc: HelpDoc, globals: readonly FlagSpec[]): string {
  const sections = [
    docBlock(doc),
    flagTable("Flags:", spec.flags),
    subcommandTable(spec.subcommands ?? []),
    flagTable("Global:", globals),
  ].filter((section) => section.length > 0);
  return `${spec.usage}\n\n${sections.join("\n")}`;
}
