// An agent launched with a write root may change files only inside that one directory, and
// has no tool that reaches the disk another way. Each harness integration says what a tool
// call would touch; this module is the one place that decides whether it runs.
import * as path from "node:path";
import { isRecord } from "../util.ts";

/** Env var orchd sets on an agent it launches with a write root: the directory's absolute path. */
export const WRITE_ROOT_ENV = "ORCH_WRITE_ROOT";

/** The write root this process was launched under, or null when it has none. */
export function writeRootOf(env: NodeJS.ProcessEnv): string | null {
  const root = env[WRITE_ROOT_ENV];
  return root === undefined || root === "" ? null : root;
}

/** What one tool call would touch, in the words of the harness that names the tool. */
export type ToolReach =
  | { readonly kind: "reads" }
  | { readonly kind: "writes"; readonly path: string }
  | { readonly kind: "other" };

/** A harness's own names for the tools a write-root agent keeps. */
export interface ToolVocabulary {
  /** Tools that change no file. */
  readonly reads: readonly string[];
  /** Tools that change the one file their input names. */
  readonly writes: readonly string[];
  /** The input field of a writing tool that holds its path. */
  readonly pathField: string;
}

/** Whether the path a tool named, taken from the agent's directory, is inside `root`. The root itself is not inside. */
export function insideWriteRoot(root: string, cwd: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(cwd, target));
  return relative !== "" && relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative);
}

/** What the model is told when the call is refused, or undefined when the call may run. */
export function writeRootRefusal(root: string, cwd: string, reach: ToolReach): string | undefined {
  switch (reach.kind) {
    case "reads":
      return undefined;
    case "writes":
      if (insideWriteRoot(root, cwd, reach.path)) return undefined;
      return `orch refused this write: ${path.resolve(cwd, reach.path)} is outside ${path.resolve(root)}, the only directory this agent may write in.`;
    case "other":
      return `orch refused this tool: this agent only reads files, and writes only inside ${path.resolve(root)}.`;
  }
}

/** What a tool call would touch, by its harness's vocabulary. A tool the vocabulary does not list is `other`. */
export function toolReach(vocabulary: ToolVocabulary, toolName: unknown, input: unknown): ToolReach {
  if (typeof toolName !== "string") return { kind: "other" };
  if (vocabulary.reads.includes(toolName)) return { kind: "reads" };
  if (!vocabulary.writes.includes(toolName) || !isRecord(input)) return { kind: "other" };
  const target = input[vocabulary.pathField];
  return typeof target === "string" ? { kind: "writes", path: target } : { kind: "other" };
}

/** The tools a write-root agent launches with, in its harness's names. */
export function writeRootTools(vocabulary: ToolVocabulary): string[] {
  return [...vocabulary.reads, ...vocabulary.writes];
}
