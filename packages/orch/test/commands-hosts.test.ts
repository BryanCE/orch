import { describe, expect, test } from "bun:test";
import { formatHostsTable } from "../src/commands/host.ts";
import type { HostGreeting, HostLinkView } from "../src/types/host.ts";
import { testHost } from "./helpers/host.ts";

const LOCAL = { version: "0.1.0", commit: "aaa111" };
const NOW = 1_000_000;

function view(patch: Partial<HostLinkView>): HostLinkView {
  return { name: "box", dest: "bryan@box", state: "idle", hostId: null, greeting: null, reason: null, lastSeen: null, retryAt: null, attempt: null, ...patch };
}

function greeting(commit: string | null): HostGreeting {
  return { host: testHost("far-1", "far-machine"), commit, version: "0.1.0" };
}

/** The data line of a one-host table. */
function line(patch: Partial<HostLinkView>): string {
  return formatHostsTable([view(patch)], LOCAL, NOW).split("\n").at(-1) ?? "";
}

describe("the table orch hosts prints", () => {
  test("a link that is up and runs this build has nothing to say", () => {
    expect(line({ state: "up", greeting: greeting("aaa111") })).toMatch(/^box\s+bryan@box\s+up\s+far-machine\s+never\s*$/);
  });

  test("a link that is up on another build says so", () => {
    expect(line({ state: "up", greeting: greeting("bbb222") })).toContain("warning: box runs orch built from bbb222; this machine runs aaa111.");
  });

  test("a link waiting to redial reads reconnecting, with why and when the next dial is due", () => {
    const row = line({ state: "backoff", reason: "ssh exited with code 255", retryAt: NOW + 11_500, attempt: 2 });
    expect(row).toMatch(/\sreconnecting\s/);
    expect(row).toContain("ssh exited with code 255. Dial 3 in 12s");
  });

  test("a link catching up reads synchronizing", () => {
    expect(line({ state: "synchronizing", attempt: 1 })).toMatch(/\ssynchronizing\s/);
  });

  test("a blocked link says why, whole", () => {
    const row = line({ state: "blocked", reason: "box answered as host other, id far-9, but box is bound to host id far-1" });
    expect(row).toMatch(/\sblocked\s/);
    expect(row).toContain("bound to host id far-1");
  });
});
