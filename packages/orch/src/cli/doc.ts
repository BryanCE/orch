import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { packageRoot } from "../util.ts";

/** Where a top-level command's doctrine lives: `help/<name>.md` in the installed package. */
export function helpDocPath(name: string): string {
  return join(packageRoot(), "help", `${name}.md`);
}

export type HelpDoc = { readonly text: string } | { readonly missing: string };

/** The doc text, or the path that should hold it. Never throws: help must always print. */
export function readHelpDoc(name: string): HelpDoc {
  const path = helpDocPath(name);
  if (!existsSync(path)) return { missing: path };
  return { text: readFileSync(path, "utf8").trimEnd() };
}
