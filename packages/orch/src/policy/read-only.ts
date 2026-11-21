// A read-only agent keeps the tools that read and nothing else: no shell, no MCP tool, no
// extension tool. It may be given one output directory, which lets it write files there and
// nowhere else. A harness integration builds one gate when its process starts and asks it
// before each tool call; this module is the one place that decides whether the call runs.
import * as path from "node:path";
import { isRecord } from "../util.ts";

/** Env var orchd sets on a read-only agent. */
export const READ_ONLY_ENV = "ORCH_READ_ONLY";
/** Env var orchd sets on a read-only agent that has an output directory: the directory's path. */
export const OUT_DIR_ENV = "ORCH_OUT_DIR";

/** What a read-only agent is held to. */
export interface ReadOnly {
  /** The one directory the agent may write in, absolute. Null: it writes nothing. */
  readonly out: string | null;
}

/** A harness's own names for the tools a read-only agent can keep. */
export interface ToolVocabulary {
  /** Tools that change no file. */
  readonly reads: readonly string[];
  /** Tools that change the one file their input names. */
  readonly writes: readonly string[];
  /** The input field of a writing tool that holds its path. */
  readonly pathField: string;
}

/** What one read-only process runs behind. */
export interface ReadOnlyGate extends ReadOnly {
  /** The directory a tool's relative path is taken from, absolute. */
  readonly cwd: string;
  /** The harness's names for the tools the agent can keep. */
  readonly tools: ToolVocabulary;
}

/** The env that tells an agent's process it is read-only, and where it may write. */
export function readOnlyEnv(readOnly: ReadOnly): Record<string, string> {
  return { [READ_ONLY_ENV]: "1", ...(readOnly.out === null ? {} : { [OUT_DIR_ENV]: readOnly.out }) };
}

/** The gate a process launched read-only runs behind, or null when its launch was not read-only. */
export function readOnlyGate(env: NodeJS.ProcessEnv, cwd: string, tools: ToolVocabulary): ReadOnlyGate | null {
  const flag = env[READ_ONLY_ENV];
  if (flag === undefined || flag === "") return null;
  const out = env[OUT_DIR_ENV];
  return { out: out === undefined || out === "" ? null : path.resolve(out), cwd: path.resolve(cwd), tools };
}

/** The tools a read-only agent launches with, in its harness's names: the reads, and the writes when it has an output directory. */
export function readOnlyTools(vocabulary: ToolVocabulary, readOnly: ReadOnly): string[] {
  return readOnly.out === null ? [...vocabulary.reads] : [...vocabulary.reads, ...vocabulary.writes];
}

/** The file a writing tool's input names, or undefined when the input names none. */
function writeTarget(tools: ToolVocabulary, input: unknown): string | undefined {
  const target = isRecord(input) ? input[tools.pathField] : undefined;
  return typeof target === "string" ? target : undefined;
}

/** Whether an absolute path is inside the directory. The directory itself is not inside. */
function inside(directory: string, target: string): boolean {
  const relative = path.relative(directory, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

/**
 * What the model is told when a tool call is refused, or undefined when the call may run.
 * A tool the vocabulary lists as a read runs. A tool it lists as a write runs when the agent
 * has an output directory and the file its input names is inside it. Every other call is
 * refused: a tool the vocabulary does not list, a tool name that is not text, and a write
 * whose input names no file.
 */
export function readOnlyRefusal(gate: ReadOnlyGate, toolName: unknown, input: unknown): string | undefined {
  if (typeof toolName === "string" && gate.tools.reads.includes(toolName)) return undefined;
  if (gate.out === null) return "orch refused this tool: this agent is read-only.";
  const target = typeof toolName === "string" && gate.tools.writes.includes(toolName) ? writeTarget(gate.tools, input) : undefined;
  if (target === undefined) return `orch refused this tool: this agent is read-only, and writes only inside ${gate.out}.`;
  const file = path.resolve(gate.cwd, target);
  return inside(gate.out, file) ? undefined : `orch refused this write: ${file} is outside ${gate.out}, the only directory this agent may write in.`;
}
