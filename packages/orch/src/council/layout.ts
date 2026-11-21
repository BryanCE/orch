// Where a council keeps its files. Every path of a council is built here, so the member's
// output directory, the prompt and the reader that scores a round agree.
import * as path from "node:path";
import { roundFileName } from "./round-file.ts";

/** A council's name is one directory name: letters, digits, `-` and `_`, starting with a letter or digit. */
export const COUNCIL_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** A council's own directory: `base` is the `council.directory` setting, taken from `cwd`. */
export function councilDirectory(cwd: string, base: string, name: string): string {
  return path.resolve(cwd, base, name);
}

/** The one directory a member writes in. */
export function memberDirectory(council: string, member: string): string {
  return path.join(council, member);
}

/** The file a member writes for one round. */
export function roundFilePath(council: string, member: string, round: number): string {
  return path.join(memberDirectory(council, member), roundFileName(round));
}
