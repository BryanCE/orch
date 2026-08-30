import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
let template: string | undefined;

function buildTemplate(): string {
  const root = mkdtempSync(join(tmpdir(), "orch-git-template-"));
  git(root, ["init"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Orch Test"]);
  writeFileSync(join(root, "README.md"), "fixture\n");
  git(root, ["add", "README.md"]);
  git(root, ["commit", "-m", "initial commit"]);
  process.once("exit", () => { try { rmSync(root, { recursive: true, force: true }); } catch {} });
  return root;
}

/** A fresh single-commit git repo, copied from the shared template. */
export function fixtureRepo(prefix: string): string {
  template ??= buildTemplate();
  const repoRoot = mkdtempSync(join(tmpdir(), prefix));
  cpSync(template, repoRoot, { recursive: true });
  return repoRoot;
}
