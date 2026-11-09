import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { announcesWindows, authorizeArgv, authorizeStep } from "../src/hosts/authorize.ts";
import { reportedOrch } from "../src/shared/host-authorize.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { hostIdentity } from "../src/hosts/identity.ts";

const ORCH_DIR = orchDirAt(join("/tmp", "orch-authorize"));
const KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFake orch@home";

function decodedScript(command: string): string {
  return Buffer.from(command.split(" ").at(-1) ?? "", "base64").toString("utf16le");
}

describe("which hosts land in Windows", () => {
  test("a Windows OpenSSH server announces itself in its version line", () => {
    expect(announcesWindows("SSH-2.0-OpenSSH_for_Windows_9.5")).toBe(true);
    expect(announcesWindows("SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13")).toBe(false);
    expect(announcesWindows(null)).toBe(false);
  });
});

describe("the orch a host reports", () => {
  test("is the last report line, and none when that line is empty", () => {
    expect(reportedOrch("orch's key is authorized here.\r\norch=/home/b/.nvm/bin/orch\r\n")).toBe("/home/b/.nvm/bin/orch");
    expect(reportedOrch("orch's key is authorized here.\norch=\n")).toBeNull();
    expect(reportedOrch("Permission denied\n")).toBeNull();
  });
});

describe("the one login that installs orch's key", () => {
  test("logs in as the person with their own ssh setup, checked against the key they confirmed", () => {
    const argv = authorizeArgv(ORCH_DIR, { dest: "bryan@box", port: 2200 }, SETTINGS_DEFAULTS.links, KEY, hostIdentity().id);
    expect(argv).not.toContain("-F");
    expect(argv).not.toContain("IdentitiesOnly=yes");
    expect(argv).toContain(`UserKnownHostsFile="${join(ORCH_DIR, "ssh", "known_hosts")}"`);
    expect(argv).toContain("StrictHostKeyChecking=yes");
    expect(argv.slice(argv.indexOf("-p"), argv.indexOf("-p") + 2)).toEqual(["-p", "2200"]);
    expect(argv.slice(-3, -1)).toEqual(["--", "bryan@box"]);
  });

  test("on a Windows host, hands PowerShell the script encoded, whatever shell sshd runs", () => {
    for (const shell of ["wsl", "windows"] as const) {
      const command = authorizeArgv(ORCH_DIR, { dest: "bryan@box", shell }, SETTINGS_DEFAULTS.links, KEY, hostIdentity().id).at(-1) ?? "";
      expect(command).toStartWith("powershell -NoProfile -NonInteractive -EncodedCommand ");
      expect(decodedScript(command)).toBe(authorizeStep({ dest: "bryan@box", shell }, KEY, hostIdentity().id).command);
    }
  });

  test("on a POSIX host, runs the script through sh", () => {
    const command = authorizeArgv(ORCH_DIR, { dest: "bryan@box" }, SETTINGS_DEFAULTS.links, KEY, hostIdentity().id).at(-1) ?? "";
    expect(command).toStartWith("sh -c '");
    expect(command).toContain("authorized_keys");
  });
});

describe("the Windows script", () => {
  test("for WSL, fills in the WSL account's shell and asks that shell for orch", () => {
    const step = authorizeStep({ dest: "bryan@box", shell: "wsl" }, KEY, hostIdentity().id);
    expect(step.where).toBe("PowerShell as Administrator");
    expect(step.command).toContain("wsl.exe -e getent passwd (wsl.exe -e id -un)");
    expect(step.command).toContain("$k=$k.Replace('@LOGIN_SHELL@',$s)");
    expect(step.command).toContain("wsl.exe -e $s -lic 'command -v orch'");
    expect(step.command).toContain("administrators_authorized_keys");
    expect(step.command).toContain("icacls");
  });

  test("for Windows itself, finds orch on the Windows PATH and pins no shell", () => {
    const step = authorizeStep({ dest: "bryan@box", shell: "windows" }, KEY, hostIdentity().id);
    expect(step.command).toContain(`$k='restrict,command="orch host serve --origin ${hostIdentity().id}" ${KEY}'`);
    expect(step.command).toContain("Get-Command orch");
    expect(step.command).not.toContain("wsl.exe");
  });

  test("drops any line orch's key had before adding the new one", () => {
    const step = authorizeStep({ dest: "bryan@box", shell: "wsl" }, KEY, hostIdentity().id);
    expect(step.command).toContain("$b='AAAAC3NzaC1lZDI1NTE5AAAAIFake'");
    expect(step.command).toContain("Where-Object { $_ -notlike \"*$b*\" }");
  });
});

describe("the POSIX script, run", () => {
  const dirs: string[] = [];
  afterEach(() => { for (const dir of dirs.splice(0)) removeTempDir(dir); });

  test("replaces orch's old line, keeps the others, pins the account's shell, and reports its orch", () => {
    const home = tempOrchDir("orch-authorize-home");
    dirs.push(home);
    const shell = join(home, "fake-shell");
    // Stands in for the account's shell: asked `command -v orch`, it names an install.
    writeFileSync(shell, "#!/bin/sh\necho /home/b/.nvm/bin/orch\n");
    chmodSync(shell, 0o755);
    mkdirSync(join(home, ".ssh"));
    const keys = join(home, ".ssh", "authorized_keys");
    writeFileSync(keys, `ssh-ed25519 AAAAOther me@laptop\nrestrict,command="sh -lc 'exec orch host serve'" ${KEY}\n`);

    const output = execFileSync("sh", ["-c", authorizeStep({ dest: "bryan@box" }, KEY, hostIdentity().id).command], { encoding: "utf8", env: { PATH: process.env.PATH, HOME: home, SHELL: shell } });

    expect(readFileSync(keys, "utf8")).toBe(`ssh-ed25519 AAAAOther me@laptop\nrestrict,command="${shell} -lic 'exec orch host serve --origin ${hostIdentity().id}'" ${KEY}\n`);
    expect(reportedOrch(output)).toBe("/home/b/.nvm/bin/orch");
  });
});
