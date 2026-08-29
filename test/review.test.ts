import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";
import * as fs from "node:fs";
import { removeTempDir } from "./helpers/tempdir.ts";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  createAgentWorktree,
  mergeReviewBranch,
  removeMergedWorktree,
  worktreeBranch,
} from "../src/worktree.ts";
import { provenDaemonPid } from "../src/daemon/lifecycle.ts";
import { ensureHarness, insertAgent, setWorktree } from "../src/store/agent-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { fixtureRepo, git } from "./helpers/git-repo.ts";

const directories: string[] = [];
const daemonDiscoveries = new Map<string, string>();

/** orch has no built-in configuration, so a spawned CLI needs a recorded composition in its
 * ORCH_DIR exactly as a real install does. */
function orchDirWithSettings(): string {
  const discovery = fs.mkdtempSync(path.join(os.tmpdir(), "orch-review-discovery-"));
  const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-review-dir-"));
  // Push in this order so afterEach stops the daemon before removing either directory.
  directories.push(discovery, orchDir);
  daemonDiscoveries.set(orchDir, discovery);
  writeSettingsFixture(orchDir, { enabled: { adapters: ["pi"], backends: [] }, defaults: { adapter: "pi" } });
  return orchDir;
}

function repo(): string {
  const repoRoot = fixtureRepo("orch-review-");
  directories.push(repoRoot);
  return repoRoot;
}

function commit(worktreePath: string, file: string, contents: string, message: string): void {
  fs.writeFileSync(path.join(worktreePath, file), contents);
  git(worktreePath, ["add", file]);
  git(worktreePath, ["commit", "-m", message]);
}

/** Seed one done agent the way orch itself records it: an identity, a harness,
 *  and a WORKTREE ENVIRONMENT axis — never one wide row keyed by its pane. */
function registerDoneAgent(orchDir: string, id: string, worktreePath: string, branch: string): string {
  const key = `headless~local~${id}`;
  fs.mkdirSync(path.join(orchDir, "agents", key), { recursive: true });
  fs.writeFileSync(path.join(orchDir, "agents", key, "status.json"), JSON.stringify({
    schema: PRESENCE_SCHEMA, agent: "pi", key, pid: process.pid, state: "done", task: "finish the feature",
  }));
  const now = Date.now();
  ensureHarness(orchDir, "pi", "pi", now);
  insertAgent(orchDir, { id, harnessId: "pi", cwd: worktreePath, name: id, createdAt: now });
  setWorktree(orchDir, id, worktreePath, branch);
  closeAllStores();
  return key;
}

function runOrch(repoRoot: string, orchDir: string, ...args: string[]): string {
  const ran = Bun.spawnSync([process.execPath, path.join(import.meta.dir, "../bin/orch.ts"), ...args], {
    cwd: repoRoot,
    // The daemon must run today's source, not a possibly stale dist/ build —
    // write commands auto-start it and deliver through its code.
    env: {
      ...process.env,
      ORCH_DIR: orchDir,
      ORCHD_ENTRYPOINT: path.join(import.meta.dir, "../src/daemon/orchd.ts"),
      ORCH_DAEMON_DISCOVERY_DIR: daemonDiscoveries.get(orchDir),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  if (!ran.success) throw new Error(`orch ${args.join(" ")} exited ${ran.exitCode}: ${ran.stderr.toString()}`);
  return ran.stdout.toString();
}

async function stopDaemon(orchDir: string): Promise<void> {
  // Only signal a daemon whose lock identity is proven for this exact store.
  const pid = provenDaemonPid(orchDir);
  if (pid === undefined || pid === process.pid) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return; // Already gone.
  }
  // Wait until the daemon actually exits and releases its open files (orch.db,
  // socket, log) — removing the dir while it lives is a guaranteed EBUSY on Windows.
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      return; // Process is gone; its handles are released.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

afterEach(async () => {
  while (directories.length) {
    const directory = directories.pop()!;
    await stopDaemon(directory);
    removeTempDir(directory);
    daemonDiscoveries.delete(directory);
  }
});

describe("review plumbing", () => {
  test("lists only done worktree agents with commits ahead", () => {
    const repoRoot = repo();
    const orchDir = orchDirWithSettings();
    const worktreePath = createAgentWorktree(repoRoot, "feature-1");
    commit(worktreePath, "feature.txt", "feature\n", "add feature");
    registerDoneAgent(orchDir, "agent1", worktreePath, worktreeBranch(worktreePath));

    const result = JSON.parse(runOrch(repoRoot, orchDir, "review", "list", "--json")) as Record<string, unknown>[];
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ target: "feature-1", state: "done", commitsAhead: 1, summary: "add feature" });
    expect(result[0]!.diff).toContain("feature.txt");
  }, 30_000);

  test("reject re-dispatches feedback through the adapter inbox", async () => {
    const repoRoot = repo();
    const orchDir = orchDirWithSettings();
    const worktreePath = createAgentWorktree(repoRoot, "iterate-1");
    commit(worktreePath, "feature.txt", "feature\n", "first pass");
    const key = registerDoneAgent(orchDir, "agent1", worktreePath, worktreeBranch(worktreePath));

    expect(runOrch(repoRoot, orchDir, "review", "reject", "iterate-1", "-m", "handle the empty case")).toContain("re-dispatched");
    // The daemon accepts the steer and delivers it asynchronously; wait for the inbox write.
    const inbox = path.join(orchDir, "agents", key, "inbox.jsonl");
    const deadline = Date.now() + 15_000;
    while (!fs.existsSync(inbox) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fs.readFileSync(inbox, "utf8")).toContain("handle the empty case");
    expect(fs.existsSync(worktreePath)).toBe(true);
  }, 30_000);

  test("approve merges and removes the worktree and branch", () => {
    const repoRoot = repo();
    const orchDir = orchDirWithSettings();
    const worktreePath = createAgentWorktree(repoRoot, "approve-1");
    const branch = worktreeBranch(worktreePath);
    commit(worktreePath, "approved.txt", "approved\n", "approved change");
    registerDoneAgent(orchDir, "agent1", worktreePath, branch);

    expect(runOrch(repoRoot, orchDir, "review", "approve", "approve-1")).toContain("fast-forward");
    expect(fs.existsSync(path.join(repoRoot, "approved.txt"))).toBe(true);
    expect(fs.existsSync(worktreePath)).toBe(false);
    expect(() => git(repoRoot, ["show-ref", "--verify", `refs/heads/${branch}`])).toThrow();
  }, 30_000);

  test("conflicting approval aborts without changing either branch", () => {
    const repoRoot = repo();
    const worktreePath = createAgentWorktree(repoRoot, "conflict-1");
    const branch = worktreeBranch(worktreePath);
    commit(worktreePath, "README.md", "branch\n", "branch change");
    commit(repoRoot, "README.md", "base change\n", "base change");
    const branchHead = git(worktreePath, ["rev-parse", "HEAD"]);

    expect(() => mergeReviewBranch(repoRoot, branch)).toThrow("merge aborted");
    expect(git(repoRoot, ["rev-parse", "HEAD"])).not.toBe(branchHead);
    expect(git(worktreePath, ["rev-parse", "HEAD"])).toBe(branchHead);
    expect(fs.readFileSync(path.join(repoRoot, "README.md"), "utf8")).toBe("base change\n");
    git(repoRoot, ["worktree", "remove", "--force", worktreePath]);
    git(repoRoot, ["branch", "-D", branch]);
  }, 30_000);

  test("non-fast-forward approval creates a merge commit", () => {
    const repoRoot = repo();
    const worktreePath = createAgentWorktree(repoRoot, "merge-1");
    const branch = worktreeBranch(worktreePath);
    commit(worktreePath, "branch.txt", "branch\n", "branch change");
    commit(repoRoot, "base.txt", "base\n", "base change");

    expect(mergeReviewBranch(repoRoot, branch)).toBe("merge-commit");
    expect(git(repoRoot, ["show", "-s", "--format=%P", "HEAD"]).split(/\s+/)).toHaveLength(2);
    removeMergedWorktree(repoRoot, worktreePath, branch);
  }, 30_000);
});
