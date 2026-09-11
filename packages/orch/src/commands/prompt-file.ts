import * as files from "node:fs";
import { resolve } from "node:path";
import { errorMessage } from "../util.ts";
import { die } from "./target.ts";
import type { ContextReference } from "../types/core.ts";

const STDIN_FD = 0;

/**
 * The reference one `--with <path>` names: absolute, so it still resolves from an
 * agent whose cwd is a `--dir` or a worktree. A missing path dies here, at dispatch,
 * never in the agent's transcript.
 */
export function contextReference(source: string): ContextReference {
  const path = resolve(source);
  let stat: files.Stats;
  try {
    stat = files.statSync(path);
  } catch (error: unknown) {
    die(`--with ${source}: ${errorMessage(error)}`);
  }
  return { path, kind: stat.isDirectory() ? "directory" : "file" };
}

/**
 * The task text `--file <path>` names, or `--file -` reads from stdin.
 *
 * A spec full of code identifiers never crosses argv this way, where one
 * apostrophe kills the command and the whole body lands in the transcript.
 */
export function readPromptFile(source: string): string {
  const label = source === "-" ? "stdin" : source;
  let body: string;
  try {
    body = files.readFileSync(source === "-" ? STDIN_FD : source, "utf8");
  } catch (error: unknown) {
    die(`Could not read the prompt from ${label}: ${errorMessage(error)}`);
  }
  const task = body.trim();
  if (!task) die(`${label} is empty; a task needs a prompt.`);
  return task;
}
