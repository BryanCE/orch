import { placeHere } from "../src/process-place.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { agentLiveness, placeAgent, placeProcess, processLiveness, recordedProcessIsLive } from "../src/process-place.ts";
import { localProcessOf } from "../src/local-process.ts";
import { processStartToken } from "../src/process-identity.ts";
import { bindHostName, closeHostLink, openHostLink } from "../src/store/host-rows.ts";
import { registerHostedAgent } from "../src/store/spawn-registration.ts";
import { currentProcess } from "../src/store/interval-rows.ts";
import { agentHost, endAgent } from "../src/store/agent-rows.ts";
import { presenceEntry } from "../src/presence/store.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { hosted, testHost } from "./helpers/host.ts";
import type { OrchDir } from "../src/types/core.ts";

const FAR = testHost("far-host-id", "far");
const STRANGER = testHost("stranger-host-id", "stranger");
const dirs: OrchDir[] = [];

afterEach(() => {
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

});

describe("an agent this orchd asked a linked host to run", () => {
  const KEY = "farag00001";
  function withFarAgent(): OrchDir {
    const orchDir = linkedDir();
    registerHostedAgent(orchDir, { key: KEY, harnessId: "pi", cwd: "/home/far", name: "far-agent", model: "m", spawner: null, host: FAR });
    return orchDir;
  }

  test("leaves a reference here and no process row", () => {
    const orchDir = withFarAgent();
    expect(agentHost(orchDir, KEY).host).toBe(FAR.id);
    expect(currentProcess(orchDir, placeHere(orchDir, KEY))).toBeUndefined();
  });

  test("reads unknown while its link is down, never dead", () => {
    const orchDir = withFarAgent();
    expect(agentLiveness(orchDir, placeAgent(orchDir, KEY))).toBe("unknown");
    expect(presenceEntry(orchDir, KEY)?.liveness).toBe("unknown");
    expect(recordedProcessIsLive(orchDir, KEY)).toBe(true);
  });

  test("reads alive while its link is up, and unknown once it drops", () => {
    const orchDir = withFarAgent();
    openHostLink(orchDir, FAR.id, Date.now());
    expect(agentLiveness(orchDir, placeAgent(orchDir, KEY))).toBe("alive");
    closeHostLink(orchDir, FAR.id, Date.now());
    expect(agentLiveness(orchDir, placeAgent(orchDir, KEY))).toBe("unknown");
  });

  test("is dead only once its ending is recorded", () => {
    const orchDir = withFarAgent();
    endAgent(orchDir, KEY, Date.now(), null);
    expect(recordedProcessIsLive(orchDir, KEY)).toBe(false);
    expect(presenceEntry(orchDir, KEY)?.liveness).toBe("dead");
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
