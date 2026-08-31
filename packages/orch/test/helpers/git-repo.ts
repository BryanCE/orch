import { cpSync, existsSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Run one git command in a repo and return its trimmed output. Bun's spawner, not node's:
 *  tests shell out to git hundreds of times and this skips the child_process layer. */
export function git(repoRoot: string, args: readonly string[]): string {
  const ran = Bun.spawnSync(["git", "-C", repoRoot, ...args], { stdout: "pipe", stderr: "pipe" });
  if (!ran.success) throw new Error(`git ${args.join(" ")} failed in ${repoRoot}: ${ran.stderr.toString().trim()}`);
  return ran.stdout.toString().trim();
}

/** `git init` plus a first commit is five subprocesses — over a second on Windows. Building it
 *  once and copying the result per test is what keeps a git-backed suite off the clock. */
const templatePath = join(tmpdir(), "orch-git-template");

/** One fixed path, so repeat runs and sibling workers reuse it instead of littering /tmp.
 *  Built aside and renamed in, which is what makes a losing racer's copy safe to discard. */
function buildTemplate(): void {
  const staging = mkdtempSync(join(tmpdir(), "orch-git-staging-"));
  git(staging, ["init"]);
  git(staging, ["config", "user.email", "test@example.com"]);
  git(staging, ["config", "user.name", "Orch Test"]);
  writeFileSync(join(staging, "README.md"), "fixture\n");
  git(staging, ["add", "README.md"]);
  git(staging, ["commit", "-m", "initial commit"]);
  try {
    renameSync(staging, templatePath);
  } catch {
    rmSync(staging, { recursive: true, force: true });
  }
}

/** A fresh single-commit git repo, copied from the shared template. Callers own its removal. */
export function fixtureRepo(prefix: string): string {
  if (!existsSync(templatePath)) buildTemplate();
  const repoRoot = mkdtempSync(join(tmpdir(), prefix));
  cpSync(templatePath, repoRoot, { recursive: true });
  return repoRoot;
}
