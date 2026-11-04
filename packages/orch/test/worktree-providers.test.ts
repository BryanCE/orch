import { describe, expect, test } from "bun:test";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { worktreeProvider } from "../src/worktrees/registry.ts";
import { resolveWorktreeIntent } from "../src/commands/spawn/flags.ts";
import { parseCommand } from "../src/commands/registry.ts";
import { settingsFromFile } from "../src/settings/read.ts";
import { SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import type { WorktreeConfig, WorktreeExec, WorktreeProviderId } from "../src/types/worktree.ts";

const CONFIG: WorktreeConfig = { ...SETTINGS_DEFAULTS.worktrees, timeout_ms: 1234 };

interface Call { readonly file: string; readonly args: readonly string[]; readonly timeoutMs: number | undefined }

/** A provider whose every command is recorded and answered by `answer`, so no git runs here. */
function recorded(id: WorktreeProviderId, answer: (args: readonly string[]) => string = () => "") {
  const calls: Call[] = [];
  const exec: WorktreeExec = (file, args, timeoutMs) => {
    calls.push({ file, args, timeoutMs });
    return answer(args);
  };
  return { provider: worktreeProvider(id, CONFIG, exec), calls };
}

const REQUEST = { from: "/repo/packages/orch", root: "/repo", name: "alpha", branch: "orch/alpha", base: "feature" };
const LAND = { root: "/repo", worktree: "/repo.orch-alpha", branch: "orch/alpha", base: "feature" };

describe("git provider", () => {
  test("creates under the repository root, forked from the named base", () => {
    const { provider, calls } = recorded("git");
    expect(provider.create(REQUEST)).toBe("/repo/.orch-worktrees/alpha");
    expect(calls).toEqual([{ file: "git", args: ["-C", "/repo", "worktree", "add", "-b", "orch/alpha", "/repo/.orch-worktrees/alpha", "feature"], timeoutMs: 1234 }]);
  });

  test("refuses a name that is a path", () => {
    expect(() => recorded("git").provider.create({ ...REQUEST, name: "../up" })).toThrow("Invalid worktree name");
  });

  test("lands in the checkout that holds the base, not at the root", () => {
    const { provider, calls } = recorded("git", (args) => args.includes("list")
      ? "worktree /repo\nHEAD 1\nbranch refs/heads/main\n\nworktree /repo.base\nHEAD 2\nbranch refs/heads/feature\n"
      : "");
    expect(provider.land(LAND)).toBe("fast-forward");
    expect(calls.at(-1)?.args).toEqual(["-C", "/repo.base", "merge", "--ff-only", "orch/alpha"]);
  });

  test("a conflict aborts the merge and says both branches are untouched", () => {
    const { provider, calls } = recorded("git", (args) => {
      if (args.includes("list")) return "worktree /repo\nHEAD 1\nbranch refs/heads/feature\n";
      if (args.includes("merge") && !args.includes("--abort")) throw new Error("conflict");
      return "";
    });
    expect(() => provider.land(LAND)).toThrow("both branches were left untouched");
    expect(calls.at(-1)?.args).toEqual(["-C", "/repo", "merge", "--abort"]);
  });

  test("a base no checkout holds moves by fast-forward only", () => {
    const { provider, calls } = recorded("git", (args) => args.includes("list") ? "worktree /repo\nHEAD 1\nbranch refs/heads/main\n" : "");
    expect(provider.land(LAND)).toBe("fast-forward");
    expect(calls.at(-1)?.args).toEqual(["-C", "/repo", "fetch", ".", "orch/alpha:feature"]);
  });

  test("keeps merged work safe and discards only when told", () => {
    const kept = recorded("git");
    kept.provider.remove({ ...LAND, discard: false });
    expect(kept.calls.map((call) => call.args.slice(2))).toEqual([["worktree", "remove", "/repo.orch-alpha"], ["branch", "-d", "orch/alpha"]]);
    const thrown = recorded("git");
    thrown.provider.remove({ ...LAND, discard: true });
    expect(thrown.calls.map((call) => call.args.slice(2))).toEqual([["worktree", "remove", "--force", "/repo.orch-alpha"], ["branch", "-D", "orch/alpha"]]);
  });
});

describe("worktrunk provider", () => {
  test("takes the path worktrunk chose and never prompts or moves a shell", () => {
    const { provider, calls } = recorded("worktrunk", () => JSON.stringify({ action: "created", branch: "orch/alpha", path: "/elsewhere/repo.orch-alpha" }));
    expect(provider.create(REQUEST)).toBe("/elsewhere/repo.orch-alpha");
    expect(provider.repositoryDirectory).toBeNull();
    expect(calls).toEqual([{
      file: "wkt",
      args: ["-C", "/repo/packages/orch", "switch", "--create", "orch/alpha", "--base", "feature", "--no-cd", "--yes", "--format", "json"],
      timeoutMs: 1234,
    }]);
  });

  test("runs the configured binary", () => {
    const calls: string[] = [];
    const exec: WorktreeExec = (file) => { calls.push(file); return JSON.stringify({ path: "/p" }); };
    worktreeProvider("worktrunk", { ...CONFIG, worktrunk_command: "wt" }, exec).create(REQUEST);
    expect(calls).toEqual(["wt"]);
  });

  test("a reply with no path is refused", () => {
    expect(() => recorded("worktrunk", () => "{}").provider.create(REQUEST)).toThrow();
  });

  test("lands from inside the worktree, keeping commits and the worktree", () => {
    const { provider, calls } = recorded("worktrunk", () => JSON.stringify({ rebased: true }));
    expect(provider.land(LAND)).toBe("rebase");
    expect(calls[0]?.args).toEqual(["-C", "/repo.orch-alpha", "merge", "feature", "--no-squash", "--no-remove", "--yes", "--format", "json"]);
  });

  test("a failed landing aborts the rebase it left behind", () => {
    const { provider, calls } = recorded("worktrunk", (args) => {
      if (args.includes("merge")) throw new Error("Rebase onto feature incomplete");
      return "";
    });
    expect(() => provider.land(LAND)).toThrow("both branches were left untouched");
    expect(calls.at(-1)).toEqual({ file: "git", args: ["-C", "/repo.orch-alpha", "rebase", "--abort"], timeoutMs: 1234 });
  });

  test("removal waits for the result and only forces on a discard", () => {
    const kept = recorded("worktrunk");
    kept.provider.remove({ ...LAND, discard: false });
    expect(kept.calls[0]?.args).toEqual(["-C", "/repo", "remove", "orch/alpha", "--foreground", "--yes", "--format", "json"]);
    const thrown = recorded("worktrunk");
    thrown.provider.remove({ ...LAND, discard: true });
    expect(thrown.calls[0]?.args).toEqual(["-C", "/repo", "remove", "orch/alpha", "--foreground", "--force", "--force-delete", "--yes", "--format", "json"]);
  });
});

describe("whether a launch wants a worktree", () => {
  const at = parseCommand("spawn", ["alpha"]);
  const intent = (flags: { wanted: boolean; provider: string | undefined }, overrides: object = {}) =>
    resolveWorktreeIntent(at, flags, settingsFromFile("settings.json", SETTINGS_FILE_SCHEMA.parse({ schemaVersion: SETTINGS_SCHEMA, runtime: "node", ...overrides })));

  test("nothing asked, nothing made", () => {
    expect(intent({ wanted: false, provider: undefined })).toBeNull();
  });

  test("the setting names the tool for a bare --worktree", () => {
    expect(intent({ wanted: true, provider: undefined }, { worktrees: { provider: "worktrunk" } })?.provider).toBe("worktrunk");
    expect(intent({ wanted: false, provider: undefined }, { defaults: { worktree: true } })?.provider).toBe("git");
  });

  test("naming a provider asks for a worktree and beats the setting", () => {
    expect(intent({ wanted: false, provider: "worktrunk" })?.provider).toBe("worktrunk");
  });

  test("an unknown provider is refused with the choices", () => {
    expect(() => intent({ wanted: true, provider: "svn" })).toThrow("git, worktrunk");
  });
});
