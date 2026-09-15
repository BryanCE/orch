import * as files from "node:fs";
import * as path from "node:path";
import { installSkills, packagedSkillNames, resolveSkillRoot, skillDigest, skillLinkTarget } from "../setup/skills.ts";
import { packageRoot } from "../util.ts";
import type { CheckResult } from "../types/doctor.ts";
import type { OrchSettings } from "../types/settings.ts";

const INSTALL_HINT = "fix: orch settings skills --install";

/** Why one harness entry fails to point at the store, or null when it points there. */
function linkDefect(entry: string, stored: string): string | null {
  const target = skillLinkTarget(entry);
  if (target === null) {
    return files.existsSync(entry) ? `${entry} is a real directory, not a link into the store` : `${entry} is missing`;
  }
  return path.resolve(target) === stored ? null : `${entry} points at ${target}, not ${stored}`;
}

/**
 * Verify the skill store holds the real files and every harness directory links into it.
 * `.agents/skills` is the cross-harness standard, so a second real copy under a harness's
 * own directory is a defect: the two drift apart and each harness reads a different skill.
 */
export function checkSkillLinks(settings: OrchSettings | null, pkgRoot: string = packageRoot()): CheckResult {
  const id = "skill-links";
  const label = "Skill links";
  // An install that was never set up has never written a skill, so there is no link to verify.
  const skills = settings?.skills;
  if (skills === undefined) return { id, label, status: "skip", detail: "no settings.json; orch has installed no skills" };
  const { install, store, link } = skills;
  if (!install) return { id, label, status: "skip", detail: "orch does not install skills; skills.install is off" };

  const names = packagedSkillNames(pkgRoot);
  if (!names.length) return { id, label, status: "skip", detail: "this build packaged no skills" };

  const storeRoot = resolveSkillRoot(store);
  const defects: string[] = [];
  for (const name of names) {
    const stored = path.join(storeRoot, name);
    if (!files.existsSync(stored)) {
      defects.push(`${stored} is missing from the store`);
      continue;
    }
    if (skillDigest(stored) !== skillDigest(path.join(pkgRoot, "skills", name))) {
      defects.push(`${stored} is stale: the installed build packages a newer ${name}`);
    }
    for (const root of link) {
      const defect = linkDefect(path.join(resolveSkillRoot(root), name), stored);
      if (defect) defects.push(defect);
    }
  }

  if (defects.length) {
    return {
      id,
      label,
      status: "warn",
      detail: `${defects.join("; ")}; ${INSTALL_HINT}`,
      fix: {
        description: `Reinstall ${names.length} packaged skill(s) into ${store} and relink ${link.join(", ") || "no harness dirs"}`,
        apply: () => { installSkills({ store, link }, pkgRoot); },
      },
    };
  }
  return { id, label, status: "ok", detail: `${names.length} skill(s) in ${store}, linked into ${link.join(", ") || "no harness dirs"}` };
}
