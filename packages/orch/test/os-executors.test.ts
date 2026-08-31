import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireDaemonRegistration,
  executorFor,
  onOsSide,
  releaseDaemonRegistration,
} from "../src/daemon/lifecycle.ts";
import { checkOsExecutors } from "../src/doctor/daemon.ts";
import { processStartToken } from "../src/process-identity.ts";
import { osSide } from "../src/util.ts";
import { removeTempDir } from "./helpers/tempdir.ts";
import type { OsSide } from "../src/types/core.ts";

const oldDiscovery = process.env.ORCH_DAEMON_DISCOVERY_DIR;
const roots: string[] = [];

function tempDir(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  roots.push(directory);
  return directory;
}

/** An OS side this process is certainly not running on. */
function farSide(): OsSide {
  return osSide() === "windows" ? "linux" : "windows";
}

afterEach(() => {
  releaseDaemonRegistration();
  if (oldDiscovery === undefined) delete process.env.ORCH_DAEMON_DISCOVERY_DIR;
  else process.env.ORCH_DAEMON_DISCOVERY_DIR = oldDiscovery;
  while (roots.length > 0) removeTempDir(roots.pop()!);
});

describe("cross-OS execution is a backend, not a peer daemon", () => {
  test("the local side supplies start, is-alive and kill", () => {
    const executor = executorFor(osSide());
    if (!executor) throw new Error("the side orch is running on always has an executor");

    expect(executor.osSide).toBe(osSide());
    expect(typeof executor.start).toBe("function");
    expect(executor.isAlive(process.pid)).toBe(true);
    expect(typeof executor.kill).toBe("function");
  });

  test("an OS side with no executor answers, and never runs the body", () => {
    let ran = false;

    const result = onOsSide(farSide(), () => {
      ran = true;
      return 1;
    });

    // Nothing can run there, which is a fact about that environment and an
    // answer to the caller - never a crash, and never a silent empty list.
    expect(result).toEqual({
      outcome: "answer",
      reason: "no-environment-role",
      exitCode: 0,
      text: `nothing runs on the ${farSide()} side from here: it declares no executor.`,
    });
    expect(ran).toBe(false);
  });

  test("the local side runs the body and hands back its value", () => {
    expect(onOsSide(osSide(), (executor) => executor.isAlive(process.pid)))
      .toEqual({ outcome: "ran", value: true });
  });

  test("doctor passes a daemon registered on the side orch is running on", () => {
    process.env.ORCH_DAEMON_DISCOVERY_DIR = tempDir("orch-executor-discovery-");
    const store = tempDir("orch-executor-store-");
    expect(acquireDaemonRegistration(store).acquired).toBe(true);

    const check = checkOsExecutors();

    expect(check.status).toBe("ok");
    expect(check.detail).toContain(osSide());
  });

  test("doctor answers, rather than failing, for a daemon on a side with no executor", () => {
    const discovery = tempDir("orch-executor-discovery-");
    process.env.ORCH_DAEMON_DISCOVERY_DIR = discovery;
    const store = tempDir("orch-executor-store-");
    const startToken = processStartToken(process.pid);
    if (startToken === undefined) throw new Error("this platform reports no process start token");
    writeFileSync(join(discovery, "orchd.registration"), JSON.stringify({
      orchDir: store,
      pid: process.pid,
      startToken,
      osSide: farSide(),
      socket: join(store, "orchd.sock"),
      token: join(store, "orchd.token"),
      port: join(store, "orchd.port"),
    }));

    const check = checkOsExecutors();

    // The daemon is real and live; what is missing is a way to reach across the
    // boundary to it. That is a declared missing capability, reported as such.
    expect(check.status).toBe("warn");
    expect(check.detail).toContain(farSide());
    expect(check.detail).toContain(`pid ${process.pid}`);
    expect(check.detail).toContain("no executor");
  });
});
