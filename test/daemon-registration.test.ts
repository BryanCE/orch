import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireDaemonRegistration, readDaemonRegistration, releaseDaemonRegistration } from "../src/daemon/lifecycle.ts";
import { checkDaemonRegistration } from "../src/doctor/daemon.ts";
import { endpointPaths } from "../src/daemon/rpc.ts";
import { daemonRuntimeFiles } from "../src/daemon/runtime-files.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const oldDiscovery = process.env.ORCH_DAEMON_DISCOVERY_DIR;
const roots: string[] = [];

function setup(): { orchDir: string; discovery: string } {
  const orchDir = mkdtempSync(join(tmpdir(), "orch-registration-store-"));
  const discovery = mkdtempSync(join(tmpdir(), "orch-registration-discovery-"));
  roots.push(orchDir, discovery);
  process.env.ORCH_DAEMON_DISCOVERY_DIR = discovery;
  return { orchDir, discovery };
}

afterEach(() => {
  releaseDaemonRegistration();
  if (oldDiscovery === undefined) delete process.env.ORCH_DAEMON_DISCOVERY_DIR;
  else process.env.ORCH_DAEMON_DISCOVERY_DIR = oldDiscovery;
  while (roots.length > 0) removeTempDir(roots.pop()!);
});

describe("machine daemon registration", () => {
  test("refuses a second start and names the live socket", () => {
    const first = setup();
    const second = mkdtempSync(join(tmpdir(), "orch-registration-store-"));
    roots.push(second);
    expect(acquireDaemonRegistration(first.orchDir).acquired).toBe(true);
    const refused = acquireDaemonRegistration(second);
    expect(refused.acquired).toBe(false);
    expect(refused.registration?.socket).toBe(join(first.orchDir, "orchd.sock"));
    expect(refused.registration?.token).toBe(join(first.orchDir, "orchd.token"));
  });

  test("evicts a registration whose process instance no longer matches", () => {
    const { orchDir, discovery } = setup();
    writeFileSync(join(discovery, "orchd.registration"), JSON.stringify({
      orchDir,
      pid: process.pid,
      startToken: "recycled-instance",
      socket: join(orchDir, "orchd.sock"),
      token: join(orchDir, "orchd.token"),
      port: join(orchDir, "orchd.port"),
    }));
    expect(acquireDaemonRegistration(orchDir).acquired).toBe(true);
    expect(readDaemonRegistration()?.pid).toBe(process.pid);
  });

  test("routes a different orch dir to its own runtime files", () => {
    const { orchDir } = setup();
    const otherDir = mkdtempSync(join(tmpdir(), "orch-registration-store-"));
    roots.push(otherDir);
    expect(acquireDaemonRegistration(orchDir).acquired).toBe(true);
    expect(endpointPaths(otherDir)).toEqual({
      socket: daemonRuntimeFiles(otherDir).socket,
      port: daemonRuntimeFiles(otherDir).port,
      token: daemonRuntimeFiles(otherDir).token,
    });
  });

  test("doctor distinguishes registered-but-dead from live-and-registered", () => {
    const { orchDir, discovery } = setup();
    writeFileSync(join(discovery, "orchd.registration"), JSON.stringify({
      orchDir,
      pid: process.pid,
      startToken: "recycled-instance",
      socket: join(orchDir, "orchd.sock"),
      token: join(orchDir, "orchd.token"),
      port: join(orchDir, "orchd.port"),
    }));
    expect(checkDaemonRegistration().detail).toContain("registered-but-dead");
    expect(acquireDaemonRegistration(orchDir).acquired).toBe(true);
    expect(checkDaemonRegistration().detail).toContain("live-and-registered");
  });
});
