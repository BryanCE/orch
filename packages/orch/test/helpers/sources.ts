import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

/** Windows joins with "\", so a path built by join() never equals one built by a glob
 *  or a literal. Every path this module hands out is "/"-separated for that reason. */
export function posixPath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function isTypeScript(name: string): boolean {
  return name.endsWith(".ts");
}

export function isTypeScriptOrTsx(name: string): boolean {
  return /\.tsx?$/.test(name);
}

/** `.d.ts` is generated declaration, never a source a rule can be violated in. */
export function isHandWrittenTypeScript(name: string): boolean {
  return name.endsWith(".ts") && !name.endsWith(".d.ts");
}

export function isAnyFile(): boolean {
  return true;
}

/** Every matching file under `directory`, absolute and "/"-separated. */
export function sourceFiles(directory: string, matchesName: (name: string) => boolean = isTypeScript): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = posixPath(join(directory, entry.name));
    if (entry.isDirectory()) return sourceFiles(path, matchesName);
    return entry.isFile() && matchesName(entry.name) ? [path] : [];
  });
}

/** The same listing, addressed the way a rule message names a file: relative to `root`. */
export function sourceFilesUnder(root: string, relativeDirectory: string, matchesName: (name: string) => boolean = isTypeScript): string[] {
  return sourceFiles(join(root, relativeDirectory), matchesName).map((path) => posixPath(relative(root, path)));
}
