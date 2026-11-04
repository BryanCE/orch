import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWall } from "../src/policy/space.ts";
import { linkedWorktrees, repositoryCommonRoot, repositoryRootOf } from "../src/worktrees/repository.ts";
import { seedAgent } from "./helpers/agent.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

const directories: string[] = [];

afterEach(() => { while (directories.length) removeTempDir(directories.pop()!); });

function tempDirectory(): string {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "orch-worktree-repo-")));
  directories.push(directory);
  return directory;
}

/** The files git leaves for a linked worktree, written by hand: no git runs under test/. */
function linkedLayout(base: string): { repo: string; worktree: string } {
  const repo = join(base, "repo");
  const worktree = join(base, "repo.orch-alpha");
  const privateDir = join(repo, ".git", "worktrees", "alpha");
  mkdirSync(privateDir, { recursive: true });
  mkdirSync(join(worktree, "packages", "orch"), { recursive: true });
  writeFileSync(join(worktree, ".git"), `gitdir: ${privateDir}\n`);
  writeFileSync(join(privateDir, "commondir"), "../..\n");
  return { repo, worktree };
}

describe("repository root", () => {
  test("a worktree beside the repository resolves to the repository", () => {
    const { repo, worktree } = linkedLayout(tempDirectory());
    expect(repositoryRootOf(join(worktree, "packages", "orch"))).toBe(repo);
    expect(repositoryRootOf(repo)).toBe(repo);
  });

  test("a submodule's .git file stands for itself", () => {
    const base = tempDirectory();
    const submodule = join(base, "repo", "vendor", "lib");
    mkdirSync(join(base, "repo", ".git", "modules", "lib"), { recursive: true });
    mkdirSync(submodule, { recursive: true });
    writeFileSync(join(submodule, ".git"), "gitdir: ../../.git/modules/lib\n");
    expect(repositoryRootOf(submodule)).toBe(submodule);
  });

  test("outside a repository there is no root, and worktree mode refuses", () => {
    const base = tempDirectory();
    expect(repositoryRootOf(base)).toBeNull();
    expect(() => repositoryCommonRoot(base)).toThrow("requires a git repository");
  });

  test("a removed worktree is no repository, even inside one", () => {
    const { repo } = linkedLayout(tempDirectory());
    expect(() => repositoryCommonRoot(join(repo, ".orch-worktrees", "gone"))).toThrow("requires a git repository");
  });
});

describe("the unspaced wall", () => {
  test("a worktree agent and its spawner are one repository", () => {
    const base = tempDirectory();
    const { repo, worktree } = linkedLayout(base);
    const orchDir = tempOrchDir("orch-worktree-wall-");
    directories.push(orchDir);
    seedAgent("spawner001", { cwd: repo }, orchDir);
    seedAgent("worker0001", { cwd: worktree, worktree, branch: "orch/alpha" }, orchDir);
    expect(checkWall(orchDir, "worker0001", "spawner001", { crossSpace: false }).allowed).toBe(true);
    expect(checkWall(orchDir, "spawner001", "worker0001", { crossSpace: false }).allowed).toBe(true);
  });

  test("another repository stays walled off", () => {
    const orchDir = tempOrchDir("orch-worktree-wall-other-");
    directories.push(orchDir);
    seedAgent("spawner001", { cwd: linkedLayout(tempDirectory()).repo }, orchDir);
    seedAgent("stranger01", { cwd: linkedLayout(tempDirectory()).worktree }, orchDir);
    expect(checkWall(orchDir, "stranger01", "spawner001", { crossSpace: false }).allowed).toBe(false);
  });
});

describe("linkedWorktrees", () => {
  test("reads every checkout, a detached one included", () => {
    const porcelain = "worktree /repo\nHEAD 1\nbranch refs/heads/main\n\nworktree /repo.orch-alpha\nHEAD 2\nbranch refs/heads/orch/alpha\n\nworktree /repo.detached\nHEAD 3\ndetached\n";
    expect(linkedWorktrees("/repo", () => porcelain)).toEqual([
      { path: "/repo", branch: "main" },
      { path: "/repo.orch-alpha", branch: "orch/alpha" },
      { path: "/repo.detached", branch: null },
    ]);
  });
});
