import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, describe, expect, test } from "bun:test";

const orchDir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-presence-schema-"));
const storePath = path.join(import.meta.dir, "../src/store.ts");

function readStatuses(): Record<string, any> {
  const script = `
    const store = await import(${JSON.stringify(storePath)});
    const statuses = {};
    for (const [key, entry] of store.loadPresence()) statuses[key] = store.statusForPresence(entry);
    console.log(JSON.stringify(statuses));
  `;
  return JSON.parse(execFileSync(process.execPath, ["-e", script], {
    env: { ...process.env, ORCH_DIR: orchDir },
    encoding: "utf8",
  }));
}

function writeStatus(key: string, status: object): void {
  const directory = path.join(orchDir, "agents", key);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "status.json"), JSON.stringify(status));
}

afterEach(() => {
  fs.rmSync(path.join(orchDir, "agents"), { recursive: true, force: true });
});

afterAll(() => {
  fs.rmSync(orchDir, { recursive: true, force: true });
});

describe("presence status schema", () => {
  test("reads a schema-2 status with its adapter id", () => {
    writeStatus("pi-2", { schema: 2, agent: "pi", pid: process.pid, state: "working" });

    expect(readStatuses()["pi-2"]).toMatchObject({ schema: 2, agent: "pi", state: "working" });
  });

  test("keeps schema-1 status records valid without adding fields", () => {
    writeStatus("legacy", { pid: process.pid, state: "idle" });

    expect(readStatuses()["legacy"]).toEqual({ pid: process.pid, state: "idle" });
    expect(readStatuses()["legacy"].agent).toBeUndefined();
  });

  test("loads a mixed directory of schema-1 and schema-2 records", () => {
    writeStatus("legacy", { pid: process.pid, state: "idle" });
    writeStatus("current", { schema: 2, agent: "pi", pid: process.pid, state: "done" });

    const statuses = readStatuses();
    expect(Object.keys(statuses)).toHaveLength(2);
    expect(statuses["legacy"].agent).toBeUndefined();
    expect(statuses["current"]).toMatchObject({ schema: 2, agent: "pi" });
  });
});
