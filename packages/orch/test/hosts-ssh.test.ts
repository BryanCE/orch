import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { authorizedKeysLine, LOGIN_SHELL_SLOT, remoteOrchCommand, sshArgv } from "../src/hosts/ssh.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";
import { hostIdFrom } from "../src/host.ts";

const ORIGIN = hostIdFrom("origin-1");

const ORCH_DIR = orchDirAt(join("/tmp", "orch-ssh-argv"));
const KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFake orch@home";

describe("the ssh command line a host link runs", () => {
  test("reads no ssh config and offers only orch's own key", () => {
    const argv = sshArgv(ORCH_DIR, { dest: "bryan@100.64.0.7" }, SETTINGS_DEFAULTS.links, ["host", "serve"]);
    expect(argv.slice(0, 6)).toEqual(["-F", "none", "-i", join(ORCH_DIR, "ssh", "id_ed25519"), "-o", "IdentitiesOnly=yes"]);
  });

  test("trusts only orch's own known hosts, and refuses a host it does not know", () => {
    const argv = sshArgv(ORCH_DIR, { dest: "bryan@100.64.0.7" }, SETTINGS_DEFAULTS.links, ["host", "serve"]);
    expect(argv).toContain(`UserKnownHostsFile="${join(ORCH_DIR, "ssh", "known_hosts")}"`);
    expect(argv).toContain("StrictHostKeyChecking=yes");
    expect(argv).toContain("BatchMode=yes");
  });

  test("gives up on a host by the link settings, on the port the host names", () => {
    const argv = sshArgv(ORCH_DIR, { dest: "bryan@box", port: 2222 }, { ...SETTINGS_DEFAULTS.links, connect_timeout_s: 7, keepalive_interval_s: 9, keepalive_count: 2 }, ["host", "serve"]);
    expect(argv).toContain("ConnectTimeout=7");
    expect(argv).toContain("ServerAliveInterval=9");
    expect(argv).toContain("ServerAliveCountMax=2");
    expect(argv.slice(argv.indexOf("-p"), argv.indexOf("-p") + 2)).toEqual(["-p", "2222"]);
    expect(argv.slice(-3)).toEqual(["--", "bryan@box", "orch host serve"]);
  });

  test("runs orch through the account's own shell, interactive and login, so its terminal's PATH finds it", () => {
    expect(remoteOrchCommand({ dest: "box" }, ["host", "serve"])).toBe(`${LOGIN_SHELL_SLOT} -lic 'exec orch host serve'`);
  });

  test("sets ORCH_DIR on the far side when the host names one, quoted", () => {
    expect(remoteOrchCommand({ dest: "box", orch_dir: "/srv/o rch" }, ["host", "serve"])).toBe(`${LOGIN_SHELL_SLOT} -lic 'exec env ORCH_DIR='\\''/srv/o rch'\\'' orch host serve'`);
  });

  test("runs orch inside WSL on a Windows host, through the WSL account's shell", () => {
    expect(remoteOrchCommand({ dest: "box", shell: "wsl" }, ["host", "serve"])).toBe(`wsl.exe -e ${LOGIN_SHELL_SLOT} -lic "exec orch host serve"`);
  });

  test("runs orch on Windows itself, setting ORCH_DIR through cmd when the host names one", () => {
    expect(remoteOrchCommand({ dest: "box", shell: "windows" }, ["host", "serve"])).toBe("orch host serve");
    expect(remoteOrchCommand({ dest: "box", shell: "windows", orch_dir: "D:\\orch" }, ["host", "serve"])).toBe(`cmd /d /c "set ORCH_DIR=D:\\orch&& orch host serve"`);
    expect(() => remoteOrchCommand({ dest: "box", shell: "windows", orch_dir: "D:\\%x%" }, ["host", "serve"])).toThrow("cannot hold");
  });

  test("refuses a far word that would need quoting", () => {
    expect(() => remoteOrchCommand({ dest: "box" }, ["host", "serve; rm -rf ~"])).toThrow("plain words");
  });
});

describe("the authorized_keys line for orch's key", () => {
  test("pins the key to orch host serve with nothing else allowed", () => {
    expect(authorizedKeysLine({ dest: "box" }, KEY, ORIGIN)).toBe(`restrict,command="${LOGIN_SHELL_SLOT} -lic 'exec orch host serve --origin origin-1'" ${KEY}`);
  });

  test("escapes the inner quotes a WSL host's command carries", () => {
    expect(authorizedKeysLine({ dest: "box", shell: "wsl" }, KEY, ORIGIN)).toBe(`restrict,command="wsl.exe -e ${LOGIN_SHELL_SLOT} -lic \\"exec orch host serve --origin origin-1\\"" ${KEY}`);
  });
});
