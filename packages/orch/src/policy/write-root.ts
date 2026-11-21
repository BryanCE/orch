// An agent launched with a write root may change files only inside that one directory, and
// has no tool that reaches the disk another way. A harness integration builds one gate when
// its process starts and asks it before each tool call; this module is the one place that
// decides whether the call runs.
import * as path from "node:path";
import { isRecord } from "../util.ts";

/** Env var orchd sets on an agent it launches with a write root: the directory's path. */
export const WRITE_ROOT_ENV = "ORCH_WRITE_ROOT";

/** A harness's own names for the tools a write-root agent keeps. */
export interface ToolVocabulary {
  /** Tools that change no file. */
  readonly reads: readonly string[];
  /** Tools that change the one file their input names. */
  readonly writes: readonly string[];
  /** The input field of a writing tool that holds its path. */
  readonly pathField: string;
}

/** The write root one process runs under. */
export interface WriteRootGate {
  /** The one directory the agent may write in, absolute. */
  readonly root: string;
  /** The directory a tool's relative path is taken from, absolute. */
  readonly cwd: string;
  /** The harness's names for the tools the agent keeps. */
  readonly tools: ToolVocabulary;
}

/** The gate a process launched under a write root runs behind, or null when its launch set none. */
export function writeRootGate(env: NodeJS.ProcessEnv, cwd: string, tools: ToolVocabulary): WriteRootGate | null {
  const root = env[WRITE_ROOT_ENV];
  return root === undefined || root === "" ? null : { root: path.resolve(root), cwd: path.resolve(cwd), tools };
}

/** The tools a write-root agent launches with, in its harness's names. */
export function writeRootTools(vocabulary: ToolVocabulary): string[] {
  return [...vocabulary.reads, ...vocabulary.writes];
}

/** The file a writing tool's input names, or undefined when the input names none. */
function writeTarget(tools: ToolVocabulary, input: unknown): string | undefined {
  const target = isRecord(input) ? input[tools.pathField] : undefined;
  return typeof target === "string" ? target : undefined;
}

/** Whether an absolute path is inside the root. The root itself is not inside. */
function insideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

/**
 * What the model is told when a tool call is refused, or undefined when the call may run.
 * A tool the vocabulary lists as a read runs. A tool it lists as a write runs when the file
 * its input names is inside the root. Every other call is refused: a tool the vocabulary does
 * not list, a tool name that is not text, and a write whose input names no file.
 */
export function writeRootRefusal(gate: WriteRootGate, toolName: unknown, input: unknown): string | undefined {
  if (typeof toolName === "string" && gate.tools.reads.includes(toolName)) return undefined;
  const target = typeof toolName === "string" && gate.tools.writes.includes(toolName) ? writeTarget(gate.tools, input) : undefined;
  if (target === undefined) return `orch refused this tool: this agent only reads files, and writes only inside ${gate.root}.`;
  const file = path.resolve(gate.cwd, target);
  return insideRoot(gate.root, file) ? undefined : `orch refused this write: ${file} is outside ${gate.root}, the only directory this agent may write in.`;
}
