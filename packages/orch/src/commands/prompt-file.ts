import * as files from "node:fs";
import { errorMessage } from "../util.ts";
import { die } from "./target.ts";

const STDIN_FD = 0;

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
