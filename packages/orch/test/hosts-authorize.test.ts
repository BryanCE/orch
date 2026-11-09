import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { announcesWindows, authorizeArgv, authorizeStep, hostShellFor } from "../src/hosts/authorize.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";

const ORCH_DIR = orchDirAt(join("/tmp", "orch-authorize"));
const KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFake orch@home";

describe("which shell a host lands in", () => {
  test("a Windows OpenSSH server means orch runs inside WSL there", () => {
    expect(announcesWindows("SSH-2.0-OpenSSH_for_Windows_9.5")).toBe(true);
    expect(hostShellFor(undefined, "SSH-2.0-OpenSSH_for_Windows_9.5")).toBe("wsl");
    expect(hostShellFor(undefined, "SSH-2.0-OpenSSH_9.6p1 Ubuntu-3ubuntu13")).toBe("posix");
    expect(hostShellFor(undefined, null)).toBe("posix");
  });

  test("what the person said wins over what the server announced", () => {
    expect(hostShellFor("posix", "SSH-2.0-OpenSSH_for_Windows_9.5")).toBe("posix");
  });
});

describe("the one login that installs orch's key", () => {
  test("logs in as the person with their own ssh setup, checked against the key they confirmed", () => {
    const argv = authorizeArgv(ORCH_DIR, { dest: "bryan@box", port: 2200 }, SETTINGS_DEFAULTS.links, KEY);
    expect(argv).not.toContain("-F");
    expect(argv).not.toContain("IdentitiesOnly=yes");
    expect(argv).toContain(`UserKnownHostsFile="${join(ORCH_DIR, "ssh", "known_hosts")}"`);
    expect(argv).toContain("StrictHostKeyChecking=yes");
    expect(argv.slice(argv.indexOf("-p"), argv.indexOf("-p") + 2)).toEqual(["-p", "2200"]);
    expect(argv.slice(-3, -1)).toEqual(["--", "bryan@box"]);
  });

  test("on a Windows host, hands PowerShell the script encoded, whatever shell sshd runs", () => {
    const argv = authorizeArgv(ORCH_DIR, { dest: "bryan@box", shell: "wsl" }, SETTINGS_DEFAULTS.links, KEY);
    const command = argv.at(-1) ?? "";
    expect(command).toStartWith("powershell -NoProfile -NonInteractive -EncodedCommand ");
    const script = Buffer.from(command.split(" ").at(-1) ?? "", "base64").toString("utf16le");
    expect(script).toBe(authorizeStep({ dest: "bryan@box", shell: "wsl" }, KEY).command);
  });

  test("on a POSIX host, runs the script through sh", () => {
    const command = authorizeArgv(ORCH_DIR, { dest: "bryan@box" }, SETTINGS_DEFAULTS.links, KEY).at(-1) ?? "";
    expect(command).toStartWith("sh -c '");
    expect(command).toContain("authorized_keys");
  });
});

describe("the command a person pastes when the login cannot do it", () => {
  test("a Windows host gets one PowerShell line that picks the file sshd reads", () => {
    const step = authorizeStep({ dest: "bryan@box", shell: "wsl" }, KEY);
    expect(step.where).toBe("PowerShell as Administrator");
    expect(step.command).toContain(`$k='restrict,command="wsl.exe -e sh -lc \\"exec orch host serve\\"" ${KEY}'`);
    expect(step.command).toContain("administrators_authorized_keys");
    expect(step.command).toContain("icacls");
  });

  test("a POSIX host gets one shell line", () => {
    const step = authorizeStep({ dest: "bryan@box" }, KEY);
    expect(step.where).toBe("a terminal");
    expect(step.command).toContain(`'restrict,command="sh -lc '\\''exec orch host serve'\\''" ${KEY}'`);
  });
});
