import { afterEach, describe, expect, test } from "bun:test";
import { forgetRemoteLiveness, placeProcess, processLiveness, recordRemoteLiveness } from "../src/process-place.ts";
import { localProcessOf } from "../src/local-process.ts";
import { processStartToken } from "../src/process-identity.ts";
import { bindHostName } from "../src/store/host-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { hosted, testHost } from "./helpers/host.ts";
import type { OrchDir } from "../src/types/core.ts";

const FAR = testHost("far-host-id", "far");
const STRANGER = testHost("stranger-host-id", "stranger");
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
  test("is placed here and asked of the OS here", () => {
    const orchDir = linkedDir();
    const startToken = processStartToken(process.pid) ?? null;
    expect(placeProcess(orchDir, hosted(process.pid, startToken)).kind).toBe("local");
    expect(processLiveness(orchDir, hosted(process.pid, startToken))).toBe("alive");
    expect(processLiveness(orchDir, hosted(process.pid, "not-this-process"))).toBe("dead");
  });
});

describe("a process on a linked host", () => {
  test("is placed on that host, never here, even when its pid is alive here", () => {
    const orchDir = linkedDir();
    const far = hosted(process.pid, processStartToken(process.pid) ?? null, FAR.id);
    expect(localProcessOf(far)).toBeNull();
    expect(placeProcess(orchDir, far)).toEqual({ kind: "linked", host: { id: FAR.id, name: "far" }, process: far });
    expect(processLiveness(orchDir, far)).toBe("unknown");
  });

  test("is what the host last answered", () => {
    const orchDir = linkedDir();
    recordRemoteLiveness(FAR.id, [{ process: hosted(4242, "t", FAR.id), alive: true }, { process: hosted(4343, null, FAR.id), alive: false }]);
    expect(processLiveness(orchDir, hosted(4242, "t", FAR.id))).toBe("alive");
    expect(processLiveness(orchDir, hosted(4343, null, FAR.id))).toBe("dead");
  });

  test("is unknown again once the link drops", () => {
    const orchDir = linkedDir();
    recordRemoteLiveness(FAR.id, [{ process: hosted(4242, "t", FAR.id), alive: false }]);
    forgetRemoteLiveness(FAR.id);
    expect(processLiveness(orchDir, hosted(4242, "t", FAR.id))).toBe("unknown");
  });
});

describe("a process on a host orch has no link to", () => {
  test("is unreachable and unknown, never asked of the OS here", () => {
    const orchDir = linkedDir();
    const stranger = hosted(process.pid, processStartToken(process.pid) ?? null, STRANGER.id);
    expect(placeProcess(orchDir, stranger).kind).toBe("unreachable");
    expect(processLiveness(orchDir, stranger)).toBe("unknown");
  });
});
