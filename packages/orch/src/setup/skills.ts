import { createHash } from "node:crypto";
import * as files from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { packageRoot } from "../util.ts";
import { hostOs } from "../host.ts";

const HOME = os.homedir();

/** Windows needs a junction to link a directory without elevation; POSIX ignores the type. */
const LINK_TYPE = hostOs() === "windows" ? "junction" : "dir";

/** Where one packaged skill landed. `target` is null for the real directory in the store
 *  and names the store directory for a harness link pointing at it. */
export interface SkillPlacement {
  path: string;
  target: string | null;
}

/** Every directory orch may place a skill in: the one store holding real files, and the
 *  harness directories that get a link into it. */
export interface SkillRoots {
  store: string;
  link: readonly string[];
}

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

/** The real skill directory, replacing whatever the last install left in the store. */
function writeSkillToStore(pkgRoot: string, name: string, store: string): string {
  const destination = path.join(store, name);
  files.mkdirSync(store, { recursive: true });
  files.rmSync(destination, { recursive: true, force: true });
  files.cpSync(path.join(pkgRoot, "skills", name), destination, { recursive: true });
  return destination;
}

/** Point a harness's own skill directory at the store, so both read one set of files. */
function linkSkillIntoHarness(name: string, stored: string, root: string): string {
  const destination = path.join(root, name);
  files.mkdirSync(root, { recursive: true });
  files.rmSync(destination, { recursive: true, force: true });
  files.symlinkSync(stored, destination, LINK_TYPE);
  return destination;
}

/** Read where a harness skill entry points, or null when it is not a link at all. */
export function skillLinkTarget(entry: string): string | null {
  try {
    return files.readlinkSync(entry);
  } catch {
    return null;
  }
}

/** Write every packaged skill into the store and link it into each harness directory, then
 *  report where each landed. The caller owns the consent gate: this writes unconditionally,
 *  so exactly one place decides whether the user's directories are written to at all. */
export function installSkills(roots: SkillRoots, pkgRoot: string = packageRoot()): SkillPlacement[] {
  const store = resolveSkillRoot(roots.store);
  const placements: SkillPlacement[] = [];
  for (const name of packagedSkillNames(pkgRoot)) {
    const stored = writeSkillToStore(pkgRoot, name, store);
    placements.push({ path: stored, target: null });
    for (const root of roots.link) {
      placements.push({ path: linkSkillIntoHarness(name, stored, resolveSkillRoot(root)), target: stored });
    }
  }
  return placements;
}

/** Every file under `dir`, as store-relative paths in one stable order. */
function skillFiles(dir: string, prefix = ""): string[] {
  const listed: string[] = [];
  for (const entry of files.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) listed.push(...skillFiles(path.join(dir, entry.name), relative));
    else listed.push(relative);
  }
  return listed;
}

/** One digest over a skill directory's paths and bytes. Two directories with the
 *  same digest hold the same skill; the store is stale when its digest differs
 *  from the packaged one. */
export function skillDigest(dir: string): string {
  const hash = createHash("sha256");
  for (const relative of skillFiles(dir)) {
    hash.update(relative).update("\0").update(files.readFileSync(path.join(dir, relative))).update("\0");
  }
  return hash.digest("hex").slice(0, 12);
}

/** One line per placement, for the commands that report what an install wrote. */
export function describeSkillPlacement(placement: SkillPlacement): string {
  return placement.target === null ? placement.path : `${placement.path} -> ${placement.target}`;
}
