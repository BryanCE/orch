import { describe, expect, test } from "bun:test";
import { commandIn, hasFixedPath, windowsPath } from "../src/policy/command-paths.ts";
import { SETTINGS_FILE_SCHEMA } from "../src/settings/schema.ts";
import { workerHeaderFor } from "../src/worker-prompt.ts";
import { getAdapter } from "../src/adapters/registry.ts";

describe("settings commands name no fixed directory", () => {
  test("an absolute path in a command is a fixed path", () => {
    expect(hasFixedPath(`powershell.exe -NoProfile -Command "Set-Location C:\\dev\\ils\\t3reports; bunx oxlint <files>"`)).toBe(true);
    expect(hasFixedPath("cd /mnt/c/dev/other && bun test")).toBe(true);
    expect(hasFixedPath("cd ~/work && bun test")).toBe(true);
    expect(hasFixedPath("\\\\wsl.localhost\\Ubuntu\\home\\x")).toBe(true);
  });

  test("a relative path or a token is not", () => {
    expect(hasFixedPath(`powershell.exe -NoProfile -Command "Set-Location {wincwd}; bunx oxlint <files>"`)).toBe(false);
    expect(hasFixedPath("bunx oxlint src/commands test")).toBe(false);
    expect(hasFixedPath("bun test 2>/dev/null")).toBe(false);
  });

  test("settings refuse a fixed path in verify, locked and gated commands", () => {
    const fixed = "cd /mnt/c/dev/other && bun test";
    const fields = SETTINGS_FILE_SCHEMA.shape;
    expect(fields.workers.safeParse({ verify_commands: [fixed] }).success).toBe(false);
    expect(fields.locked_commands.safeParse({ commands: [fixed] }).success).toBe(false);
    expect(fields.gated_commands.safeParse([fixed]).success).toBe(false);
    expect(fields.workers.safeParse({ verify_commands: ["cd {cwd} && bun test"] }).success).toBe(true);
  });

  test("settings refuse prose and globs in locked and gated commands", () => {
    const fields = SETTINGS_FILE_SCHEMA.shape;
    for (const prose of ["bun test (whole suite; only bun test <file> over your own files)", "any database migration, generate, push or reset command", "bun script:*", "scripts/*"]) {
      expect(fields.locked_commands.safeParse({ commands: [prose] }).success).toBe(false);
      expect(fields.gated_commands.safeParse([prose]).success).toBe(false);
    }
    expect(fields.locked_commands.safeParse({ commands: ["bun test", "bun db:gen", "bunx tsc --noEmit", "git push"] }).success).toBe(true);
  });
});

describe("the agent's own directory fills the tokens", () => {
  test("a WSL drive mount becomes its drive, other WSL paths the distro share", () => {
    expect(windowsPath("/mnt/c/dev/personal/orch", "Ubuntu")).toBe("C:\\dev\\personal\\orch");
    expect(windowsPath("/home/bryan/orch", "Ubuntu")).toBe("\\\\wsl.localhost\\Ubuntu\\home\\bryan\\orch");
    expect(windowsPath("C:\\dev\\orch", undefined)).toBe("C:\\dev\\orch");
  });

  test("both tokens are replaced", () => {
    expect(commandIn(`powershell.exe -Command "Set-Location {wincwd}; bunx oxlint"`, "/mnt/c/dev/orch", "Ubuntu")).toBe(`powershell.exe -Command "Set-Location C:\\dev\\orch; bunx oxlint"`);
    expect(commandIn("cd {cwd} && bun test", "/mnt/c/dev/orch", "Ubuntu")).toBe("cd /mnt/c/dev/orch && bun test");
  });

  test("the worker header carries the agent's own directory, never another project's", () => {
    const header = workerHeaderFor(getAdapter("pi"), { cwd: "/mnt/c/dev/personal/orch", verifyCommands: [`powershell.exe -NoProfile -Command "Set-Location {wincwd}; bunx oxlint <files>"`] });
    expect(header).toContain("Set-Location C:\\dev\\personal\\orch; bunx oxlint <files>");
    expect(header).toContain("Work only inside /mnt/c/dev/personal/orch.");
  });
});
