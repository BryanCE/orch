import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { authorizedKeysLine, remoteOrchCommand, sshArgv } from "../src/hosts/ssh.ts";
import { orchDirAt } from "../src/orch-dir.ts";
import { SETTINGS_DEFAULTS } from "../src/settings/schema.ts";

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
    expect(argv.slice(-3, -1)).toEqual(["--", "bryan@box"]);
  });

  test("runs orch through a login shell, so the profile's PATH finds it", () => {
    expect(remoteOrchCommand({ dest: "box" }, ["host", "serve"])).toBe("sh -lc 'exec orch host serve'");
  });

  test("sets ORCH_DIR on the far side when the host names one, quoted", () => {
    expect(remoteOrchCommand({ dest: "box", orch_dir: "/srv/o rch" }, ["host", "serve"])).toBe(`sh -lc 'exec env ORCH_DIR='\\''/srv/o rch'\\'' orch host serve'`);
  });

  test("runs orch inside WSL on a Windows host", () => {
    expect(remoteOrchCommand({ dest: "box", shell: "wsl" }, ["host", "serve"])).toBe(`wsl.exe -e sh -lc "exec orch host serve"`);
  });

  test("refuses a far word that would need quoting", () => {
    expect(() => remoteOrchCommand({ dest: "box" }, ["host", "serve; rm -rf ~"])).toThrow("plain words");
  });
});

describe("the authorized_keys line for orch's key", () => {
  test("pins the key to orch host serve with nothing else allowed", () => {
    expect(authorizedKeysLine({ dest: "box" }, KEY)).toBe(`restrict,command="sh -lc 'exec orch host serve'" ${KEY}`);
  });

  test("escapes the inner quotes a WSL host's command carries", () => {
    expect(authorizedKeysLine({ dest: "box", shell: "wsl" }, KEY)).toBe(`restrict,command="wsl.exe -e sh -lc \\"exec orch host serve\\"" ${KEY}`);
  });
});
