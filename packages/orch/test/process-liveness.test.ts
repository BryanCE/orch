import { afterEach, describe, expect, test } from "bun:test";
import { forgetRemoteLiveness, processLiveness, recordRemoteLiveness } from "../src/process-liveness.ts";
import { processStartToken } from "../src/process-identity.ts";
import { hostIdentity } from "../src/host.ts";
import { bindHostName } from "../src/store/host-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import type { OrchDir } from "../src/types/core.ts";

const FAR = { id: "far-host-id", name: "far", os: "linux" } as const;
const dirs: OrchDir[] = [];

afterEach(() => {
  forgetRemoteLiveness(FAR.id);
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

/** An orch dir where the name `far` is bound to the far host, as a link that came up leaves it. */
function linkedDir(): OrchDir {
  const orchDir = tempOrchDir("orch-liveness-");
  dirs.push(orchDir);
  bindHostName(orchDir, "far", FAR, Date.now());
  return orchDir;
}

describe("a process on this machine", () => {
  test("is asked of the OS here", () => {
    const orchDir = linkedDir();
    const startToken = processStartToken(process.pid) ?? null;
    expect(processLiveness(orchDir, { hostId: hostIdentity().id, pid: process.pid, startToken })).toBe("alive");
    expect(processLiveness(orchDir, { hostId: hostIdentity().id, pid: process.pid, startToken: "not-this-process" })).toBe("dead");
  });
});

describe("a process on a linked host", () => {
  test("is unknown, never dead, until the host answers", () => {
    expect(processLiveness(linkedDir(), { hostId: FAR.id, pid: 4242, startToken: "t" })).toBe("unknown");
  });

  test("is what the host last answered", () => {
    const orchDir = linkedDir();
    recordRemoteLiveness(FAR.id, [{ pid: 4242, startToken: "t", alive: true }, { pid: 4343, startToken: null, alive: false }]);
    expect(processLiveness(orchDir, { hostId: FAR.id, pid: 4242, startToken: "t" })).toBe("alive");
    expect(processLiveness(orchDir, { hostId: FAR.id, pid: 4343, startToken: null })).toBe("dead");
  });

  test("is unknown again once the link drops", () => {
    const orchDir = linkedDir();
    recordRemoteLiveness(FAR.id, [{ pid: 4242, startToken: "t", alive: false }]);
    forgetRemoteLiveness(FAR.id);
    expect(processLiveness(orchDir, { hostId: FAR.id, pid: 4242, startToken: "t" })).toBe("unknown");
  });
});
