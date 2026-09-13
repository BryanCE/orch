import { afterEach, describe, expect, test } from "bun:test";
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkSkillLinks } from "../src/doctor/skills.ts";
import { installSkills } from "../src/setup/skills.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";
import { fileSettingsManager } from "../src/settings/manager.ts";
const temps: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

function makeOrchDir(prefix: string): OrchDir {
  const dir = tempOrchDir(prefix);
  temps.push(dir);
  return dir;
}

/** A package root shipping one skill, so the installer has something to place. */
function packagedSkill(name: string, body: string): string {
  const pkgRoot = tempDir("orch-skill-pkg-");
  mkdirSync(join(pkgRoot, "skills", name), { recursive: true });
  writeFileSync(join(pkgRoot, "skills", name, "SKILL.md"), body);
  return pkgRoot;
}

afterEach(() => {
  for (const dir of temps.splice(0)) removeTempDir(dir);
});

describe("skill store and harness links", () => {
  test("writes real files to the store and links each harness dir into it", () => {
    const pkgRoot = packagedSkill("orch", "store copy\n");
    const store = tempDir("orch-skill-store-");
    const harness = tempDir("orch-skill-harness-");

    const placed = installSkills({ store, link: [harness] }, pkgRoot);

    expect(lstatSync(join(store, "orch")).isSymbolicLink()).toBe(false);
    expect(lstatSync(join(harness, "orch")).isSymbolicLink()).toBe(true);
    expect(readlinkSync(join(harness, "orch"))).toBe(join(store, "orch"));
    expect(readFileSync(join(harness, "orch", "SKILL.md"), "utf8")).toBe("store copy\n");
    expect(placed).toEqual([
      { path: join(store, "orch"), target: null },
      { path: join(harness, "orch"), target: join(store, "orch") },
    ]);
  });

  test("replaces a real directory left in a harness dir with a link into the store", () => {
    const pkgRoot = packagedSkill("orch", "current\n");
    const store = tempDir("orch-skill-store-");
    const harness = tempDir("orch-skill-harness-");
    mkdirSync(join(harness, "orch"), { recursive: true });
    writeFileSync(join(harness, "orch", "SKILL.md"), "second copy that drifted\n");

    installSkills({ store, link: [harness] }, pkgRoot);

    expect(lstatSync(join(harness, "orch")).isSymbolicLink()).toBe(true);
    expect(readFileSync(join(harness, "orch", "SKILL.md"), "utf8")).toBe("current\n");
  });

  test("doctor reports a harness dir holding a real directory instead of a link", () => {
    const pkgRoot = packagedSkill("orch", "current\n");
    const store = tempDir("orch-skill-store-");
    const harness = tempDir("orch-skill-harness-");
    const orchDir = makeOrchDir("orch-skill-dir-");
    writeSettingsFixture(orchDir, { skills: { install: true, store, link: [harness] } });
    installSkills({ store, link: [] }, pkgRoot);
    mkdirSync(join(harness, "orch"), { recursive: true });

    const result = checkSkillLinks(fileSettingsManager(orchDir).current(), pkgRoot);

    expect(result.status).toBe("warn");
    expect(result.detail).toContain("is a real directory, not a link into the store");
    expect(result.detail).toContain("orch settings skills --install");
  });

  test("doctor passes once every harness dir links into the store", () => {
    const pkgRoot = packagedSkill("orch", "current\n");
    const store = tempDir("orch-skill-store-");
    const harness = tempDir("orch-skill-harness-");
    const orchDir = makeOrchDir("orch-skill-dir-");
    writeSettingsFixture(orchDir, { skills: { install: true, store, link: [harness] } });
    installSkills({ store, link: [harness] }, pkgRoot);

    expect(checkSkillLinks(fileSettingsManager(orchDir).current(), pkgRoot).status).toBe("ok");
  });

  test("doctor skips when the user turned the skill install off", () => {
    const orchDir = makeOrchDir("orch-skill-dir-");
    writeSettingsFixture(orchDir, { skills: { install: false } });

    expect(checkSkillLinks(fileSettingsManager(orchDir).current()).status).toBe("skip");
  });
});
