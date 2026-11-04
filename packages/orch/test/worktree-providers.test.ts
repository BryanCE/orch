import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import { worktreeProvider } from "../src/worktrees/registry.ts";
import { includedIgnored } from "../src/worktrees/git.ts";
import { resolveWorktreeIntent } from "../src/commands/spawn/flags.ts";
import { parseCommand } from "../src/commands/registry.ts";
import { settingsFromFile } from "../src/settings/read.ts";
import { SETTINGS_FILE_SCHEMA, SETTINGS_SCHEMA } from "../src/settings/schema.ts";
import type { WorktreeConfig, WorktreeExec, WorktreeProviderId } from "../src/types/worktree.ts";

const CONFIG: WorktreeConfig = { ...SETTINGS_DEFAULTS.worktrees, worktrunk_commands: [...SETTINGS_DEFAULTS.worktrees.worktrunk_commands], timeout_ms: 1234 };

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

const ENVIRONMENT = { path: process.env.PATH, bin: process.env.WORKTRUNK_BIN };
const directories: string[] = [];

function restoreEnvironment(): void {
  process.env.PATH = ENVIRONMENT.path;
  if (ENVIRONMENT.bin === undefined) delete process.env.WORKTRUNK_BIN;
  else process.env.WORKTRUNK_BIN = ENVIRONMENT.bin;
}

/** A PATH holding exactly these executables, with no WORKTRUNK_BIN. */
function pathOf(...binaries: string[]): void {
  const directory = mkdtempSync(join(tmpdir(), "orch-worktrunk-path-"));
  directories.push(directory);
  for (const binary of binaries) {
    const file = join(directory, binary);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, "#!/bin/sh\n");
    chmodSync(file, 0o755);
  }
  process.env.PATH = binaries.map((binary) => dirname(join(directory, binary))).join(delimiter);
  delete process.env.WORKTRUNK_BIN;
}

function ranBinary(): string | undefined {
  const { provider, calls } = recorded("worktrunk", () => JSON.stringify({ path: "/p" }));
  provider.create(REQUEST);
  return calls[0]?.file;
}

describe("finding the worktrunk binary", () => {
  afterEach(() => {
    restoreEnvironment();
    while (directories.length) removeTempDir(directories.pop()!);
  });

  test("the first listed name on PATH wins", () => {
    pathOf("wt", "wkt");
    expect(ranBinary()).toBe("wkt");
    pathOf("wt");
    expect(ranBinary()).toBe("wt");
  });

  test("WORKTRUNK_BIN beats the list", () => {
    pathOf("wkt");
    process.env.WORKTRUNK_BIN = "/opt/worktrunk/wt";
    expect(ranBinary()).toBe("/opt/worktrunk/wt");
  });

  test("Windows Terminal is never taken for worktrunk", () => {
    pathOf("WindowsApps/wt");
    const { provider, calls } = recorded("worktrunk");
    expect(provider.unavailable()).toContain("worktrees.worktrunk_commands");
    expect(() => provider.create(REQUEST)).toThrow("could not find worktrunk");
    expect(calls).toEqual([]);
  });

  /** What orch runs when the user's setting says `entries`. */
  function ranWith(entries: string[]): Call | undefined {
    const calls: Call[] = [];
    const exec: WorktreeExec = (file, args, timeoutMs) => { calls.push({ file, args, timeoutMs }); return JSON.stringify({ path: "/p" }); };
    worktreeProvider("worktrunk", { ...CONFIG, worktrunk_commands: entries }, exec).create(REQUEST);
    return calls[0];
  }

  test("a name the user added is found", () => {
    pathOf("worktrunk-cli");
    expect(ranWith(["worktrunk-cli"])?.file).toBe("worktrunk-cli");
  });

  test("a command the user gave keeps its own arguments", () => {
    pathOf("git");
    const call = ranWith(["git wt"]);
    expect(call?.file).toBe("git");
    expect(call?.args.slice(0, 4)).toEqual(["wt", "-C", REQUEST.from, "switch"]);
  });

  test("a path the user gave is used as it stands, spaces included", () => {
    pathOf();
    const directory = mkdtempSync(join(tmpdir(), "orch worktrunk path-"));
    directories.push(directory);
    const binary = join(directory, "worktrunk");
    writeFileSync(binary, "#!/bin/sh\n");
    expect(ranWith([binary])?.file).toBe(binary);
  });

  test("nothing found says how to tell orch, and runs nothing", () => {
    pathOf();
    const { provider, calls } = recorded("worktrunk");
    expect(provider.unavailable()).toContain("orch settings worktrees.worktrunk_commands");
    expect(calls).toEqual([]);
  });
});

describe("provisioning a git worktree", () => {
  const directory = (): string => {
    const made = mkdtempSync(join(tmpdir(), "orch-provision-"));
    directories.push(made);
    return made;
  };
  afterEach(() => { while (directories.length) removeTempDir(directories.pop()!); });

  test("an entry on either side narrows the other", () => {
    expect(includedIgnored([".env", "node_modules/", "pkg/"], [".env", "dist/", "node_modules/", "pkg/gen.ts"])).toEqual([".env", "node_modules/", "pkg/gen.ts"]);
    expect(includedIgnored(["node_modules/a/"], ["node_modules/"])).toEqual(["node_modules/a/"]);
  });

  test("what is included but not ignored stays behind", () => {
    expect(includedIgnored(["notes.txt"], [".env"])).toEqual([]);
  });

  test("no .worktreeinclude runs nothing and copies nothing", () => {
    const { provider, calls } = recorded("git");
    provider.provision({ source: directory(), worktree: directory(), base: "main" });
    expect(calls).toEqual([]);
  });

  test("copies files and directories, keeps links, skips what exists and orch's own directory", () => {
    const source = directory();
    const worktree = directory();
    writeFileSync(join(source, ".worktreeinclude"), "*\n");
    writeFileSync(join(source, ".env"), "SECRET=1\n");
    mkdirSync(join(source, "node_modules", ".bin"), { recursive: true });
    writeFileSync(join(source, "node_modules", "a.js"), "a\n");
    symlinkSync("../a.js", join(source, "node_modules", ".bin", "a"));
    mkdirSync(join(source, ".orch-worktrees", "other"), { recursive: true });
    writeFileSync(join(worktree, ".env"), "KEEP=1\n");
    const { provider } = recorded("git", () => ".env\nnode_modules/\n.orch-worktrees/other/\n");
    provider.provision({ source, worktree, base: "main" });
    expect(readFileSync(join(worktree, ".env"), "utf8")).toBe("KEEP=1\n");
    expect(readFileSync(join(worktree, "node_modules", "a.js"), "utf8")).toBe("a\n");
    expect(readlinkSync(join(worktree, "node_modules", ".bin", "a"))).toBe("../a.js");
    expect(existsSync(join(worktree, ".orch-worktrees"))).toBe(false);
  });
});

describe("worktrunk provider", () => {
  beforeEach(() => { process.env.WORKTRUNK_BIN = "wkt"; });
  afterEach(restoreEnvironment);

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

  test("a reply with no path is refused", () => {
    expect(() => recorded("worktrunk", () => "{}").provider.create(REQUEST)).toThrow();
  });

  test("provisions from the base, and only what .worktreeinclude names", () => {
    const { provider, calls } = recorded("worktrunk");
    provider.provision({ source: "/repo", worktree: "/repo.orch-alpha", base: "feature" });
    expect(calls[0]?.args).toEqual(["-C", "/repo.orch-alpha", "step", "copy-ignored", "--from", "feature", "--require-include", "--yes", "--format", "json"]);
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
