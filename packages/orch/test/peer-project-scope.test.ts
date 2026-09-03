import { afterEach, describe, expect, test } from "bun:test";
import { LAUNCH_ENV } from "../src/identity/launch.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeTempDir } from "./helpers/tempdir.ts";
import { seedStatus } from "./helpers/presence.ts";
import { peerSummaries, resolvePeer } from "../src/agent/peers.ts";
import { daemonClientForPeerView, daemonClientForPeers } from "./helpers/daemon-client.ts";
import { peerView } from "../src/daemon/peer-view.ts";
import { seedAgent } from "./helpers/agent.ts";

const originalOrchDir = process.env.ORCH_DIR;
const originalAgentKey = process.env[LAUNCH_ENV];
const tempDirs: string[] = [];

function makeOrchDir(): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-peer-project-"));
  tempDirs.push(directory);
  process.env.ORCH_DIR = directory;
  // The caller is a human session unless a test explicitly becomes an agent.
  delete process.env[LAUNCH_ENV];
  return directory;
}

afterEach(() => {
  if (originalOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = originalOrchDir;
  if (originalAgentKey === undefined) delete process.env[LAUNCH_ENV];
  else process.env[LAUNCH_ENV] = originalAgentKey;
  while (tempDirs.length) removeTempDir(tempDirs.pop()!);
});

// One machine runs many projects against one $ORCH_DIR, and one shared plexer
// session gives them all one space — so the project is the fleet boundary.
// This is the regression wall for the bleed where an agent in project A saw and
// could steer project B's whole worker fleet through orch_agents/orch_send.
describe("peer discovery walls on the project", () => {
  const ownKey = "caller0001";

  test("a same-workspace peer from another project is invisible by default", async () => {
    const directory = makeOrchDir();
    seedStatus(directory, "sibling001", { pid: process.pid, state: "working" });
    seedStatus(directory, "foreigner1", { pid: process.pid, label: "foreigner", state: "working", project: "/some/other/project" });

    const keys = (await peerSummaries(daemonClientForPeers(["sibling001", "foreigner1"]), ownKey)).map((peer) => peer.key);
    expect(keys).toEqual(["sibling001"]);
  });

  test("all_workspaces deliberately lifts the project wall", async () => {
    const directory = makeOrchDir();
    seedStatus(directory, "foreigner1", { pid: process.pid, label: "foreigner", state: "working", project: "/some/other/project" });

    const keys = (await peerSummaries(daemonClientForPeers(["foreigner1"]), ownKey, true)).map((peer) => peer.key);
    expect(keys).toEqual(["foreigner1"]);
  });

  test("a cross-project target does not resolve for sends without the explicit flag", async () => {
    const directory = makeOrchDir();
    seedStatus(directory, "foreigner1", { pid: process.pid, label: "foreigner", state: "working", project: "/some/other/project" });

    const refused = await resolvePeer(daemonClientForPeers(["foreigner1"]), "foreigner", ownKey);
    expect("error" in refused).toBe(true);
    const allowed = await resolvePeer(daemonClientForPeers(["foreigner1"]), "foreigner", ownKey, true);
    expect("peer" in allowed).toBe(true);
  });

  test("a record with no project stamp is malformed and never listed", async () => {
    const directory = makeOrchDir();
    seedStatus(directory, "unstamped1", { pid: process.pid, state: "working", project: undefined });

    expect(await peerSummaries(daemonClientForPeers(["unstamped1"]), ownKey)).toEqual([]);
  });

  test("a spawned agent's all_workspaces flag is ignored", async () => {
    const directory = makeOrchDir();
    seedStatus(directory, "foreigner1", { pid: process.pid, label: "foreigner", state: "working", project: "/some/other/project" });
    const rootKey = "root000001";
    seedAgent(rootKey, {}, directory);
    seedAgent(ownKey, { spawnedBy: rootKey }, directory);

    process.env[LAUNCH_ENV] = ownKey;
    const view = peerView(directory, ownKey, ["foreigner1"], true);
    expect(view.visible).toEqual([]);
    expect("error" in await resolvePeer(daemonClientForPeerView(view), "foreigner", ownKey, true)).toBe(true);
  });
});
