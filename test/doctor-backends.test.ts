import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { checkBackendCapabilities, checkMalformedPresenceRecords } from "../src/doctor.ts";

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
  test("reports every registered backend and boolean capability fields", async () => {
    const result = await checkBackendCapabilities();
    expect(result.backends?.map((backend) => backend.id)).toEqual(["herdr", "headless", "tmux"]);
    for (const backend of result.backends ?? []) {
      expect(typeof backend.available).toBe("boolean");
      expect(typeof backend.insideSession).toBe("boolean");
      expect(typeof backend.panes).toBe("boolean");
      expect(typeof backend.focusable).toBe("boolean");
      expect(typeof backend.canSendKeys).toBe("boolean");
    }
  });

  test("reports only malformed or legacy presence records", async () => {
    const directory = tempDir();
    const previous = process.env.ORCH_DIR;
    process.env.ORCH_DIR = directory;
    try {
      const agents = path.join(directory, "agents");
      fs.mkdirSync(path.join(agents, "herdr~wD~p2"), { recursive: true });
      fs.writeFileSync(path.join(agents, "herdr~wD~p2", "status.json"), JSON.stringify({ schemaVersion: 1 }));
      fs.mkdirSync(path.join(agents, "wD:p1"), { recursive: true });
      fs.writeFileSync(path.join(agents, "wD:p1", "status.json"), JSON.stringify({}));

      const result = await checkMalformedPresenceRecords();
      expect(result.status).toBe("fail");
      expect(result.ignoredRecords).toEqual([{ path: path.join(agents, "wD:p1"), reason: expect.any(String) }]);
    } finally {
      if (previous === undefined) delete process.env.ORCH_DIR;
      else process.env.ORCH_DIR = previous;
    }
  });
});
