import * as files from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { packageRoot } from "../util.ts";

const HOME = os.homedir();

/** Expand a configured skill root: `~` is the home directory, and a bare relative path
 *  resolves against it, so settings.json can name a location portably. */
export function resolveSkillRoot(root: string): string {
  if (root === "~") return HOME;
  if (root.startsWith("~/")) return path.join(HOME, root.slice(2));
  return path.resolve(HOME, root);
}

/** The packaged skill directory names, in the order they appear on disk. */
export function packagedSkillNames(pkgRoot: string = packageRoot()): string[] {
  const source = path.join(pkgRoot, "skills");
  if (!files.existsSync(source)) return [];
  return files.readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/** One skill written into one root, replacing whatever the last install left there. */
function writeSkill(pkgRoot: string, name: string, root: string): string {
  const destination = path.join(root, name);
  files.mkdirSync(root, { recursive: true });
  files.rmSync(destination, { recursive: true, force: true });
  files.cpSync(path.join(pkgRoot, "skills", name), destination, { recursive: true });
  return destination;
}

/** Copy every packaged skill into every root and report where each landed. The caller owns
 *  the consent gate: this writes unconditionally, so exactly one place decides whether the
 *  user's harness directories are written to at all. */
export function installSkills(roots: readonly string[], pkgRoot: string = packageRoot()): string[] {
  const written: string[] = [];
  for (const name of packagedSkillNames(pkgRoot)) {
    for (const root of roots) written.push(writeSkill(pkgRoot, name, resolveSkillRoot(root)));
  }
  return written;
}
