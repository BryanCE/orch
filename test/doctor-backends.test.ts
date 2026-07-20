import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { backendCapabilitiesVerdict, checkBackendCapabilities } from "../src/doctor/backends.ts";
import { checkMalformedPresenceRecords } from "../src/doctor/presence.ts";
import type { DoctorBackendReport } from "../src/doctor-types.ts";
import { PRESENCE_SCHEMA } from "../src/presence/schema.ts";

/** One backend's probe result. Injected so the verdict is provable without the
 *  suite happening to run inside a herdr or tmux session. */
function report(id: string, available: boolean, insideSession: boolean): DoctorBackendReport {
  return { id, available, insideSession, workspace: null, panes: true, focusable: true, canSendKeys: true };
}

const directories: string[] = [];

function tempDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orch-doctor-backends-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  while (directories.length) fs.rmSync(directories.pop()!, { recursive: true, force: true });
});

describe("doctor backend and presence checks", () => {
  test("reports every registered backend and boolean capability fields", () => {
    const result = checkBackendCapabilities();
    expect(result.backends?.map((backend) => backend.id)).toEqual(["herdr", "headless", "tmux"]);
    for (const backend of result.backends ?? []) {
      expect(typeof backend.available).toBe("boolean");
      expect(typeof backend.insideSession).toBe("boolean");
      expect(typeof backend.panes).toBe("boolean");
      expect(typeof backend.focusable).toBe("boolean");
      expect(typeof backend.canSendKeys).toBe("boolean");
    }
  });

  // The observed real-world install: herdr is the active pane backend, headless and
  // tmux are also installed, and tmux is not inside a session because you cannot be
  // inside a herdr session and a tmux session at once. Requiring insideSession of
  // every backend made this permanently unsatisfiable.
  test("passes with herdr active while an installed tmux sits outside a session", () => {
    const result = backendCapabilitiesVerdict([
      report("herdr", true, true),
      report("headless", true, true),
      report("tmux", true, false),
    ]);

    expect(result.status).toBe("ok");
  });

  test("marks the active backend and renders one backend per line", () => {
    const result = backendCapabilitiesVerdict([
      report("herdr", true, true),
      report("headless", true, true),
      report("tmux", true, false),
    ]);

    expect(result.detail).toContain("herdr (active)");
    expect(result.detail.split("\n")).toHaveLength(3);
    expect(result.detail).not.toContain("\\n");
  });

  test("fails when the active backend is outside a live session", () => {
    const result = backendCapabilitiesVerdict([
      report("herdr", true, false),
      report("tmux", true, false),
    ], "herdr");

    expect(result.status).toBe("fail");
    expect(result.detail).toContain("active backend herdr is not inside a live session");
  });

  test("fails when any installed backend is unavailable, active or not", () => {
    const result = backendCapabilitiesVerdict([
      report("herdr", true, true),
      report("tmux", false, false),
    ]);

    expect(result.status).toBe("fail");
    expect(result.detail).toContain("unavailable: tmux");
  });

  test("honours the configured default over the probe order", () => {
    const result = backendCapabilitiesVerdict([
      report("herdr", true, true),
      report("headless", true, true),
    ], "headless");

    expect(result.detail).toContain("headless (active)");
    expect(result.status).toBe("ok");
  });

  test("reports only records missing the current schema stamp", () => {
    const directory = tempDir();
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = directory;
    try {
      const agents = path.join(directory, "agents");
      fs.mkdirSync(path.join(agents, "herdr~wD~p2"), { recursive: true });
      fs.writeFileSync(path.join(agents, "herdr~wD~p2", "status.json"), JSON.stringify({ schema: PRESENCE_SCHEMA }));
      fs.mkdirSync(path.join(agents, "wD-p1"), { recursive: true });
      fs.writeFileSync(path.join(agents, "wD-p1", "status.json"), JSON.stringify({}));

      const result = checkMalformedPresenceRecords();
      expect(result.status).toBe("fail");
      const ignored = result.ignoredRecords ?? [];
      expect(ignored).toHaveLength(1);
      expect(ignored[0]?.path).toBe(path.join(agents, "wD-p1"));
      expect(typeof ignored[0]?.reason).toBe("string");
    } finally {
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  });
});
