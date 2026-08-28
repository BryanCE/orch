import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdSettingsNotify } from "../src/commands/settings.ts";
import { loadConfig } from "../src/config.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

// `orch settings notify` is the writer for the settings.json `notify` array. Sink ids and the
// fields each takes come from the notifier registry, so nothing here is hardcoded per sink.

let root = "";
let previousOrchDir: string | undefined;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "orch-settings-notify-"));
  previousOrchDir = process.env.ORCH_DIR;
  process.env.ORCH_DIR = root;
  writeSettingsFixture(root, {
    enabled: { adapters: ["pi"], backends: ["headless"] },
    defaults: { adapter: "pi", backend: "headless" },
  });
});

afterEach(() => {
  if (previousOrchDir === undefined) delete process.env.ORCH_DIR;
  else process.env.ORCH_DIR = previousOrchDir;
  removeTempDir(root);
});

async function captureNotify(args: string[]): Promise<string> {
  const output: string[] = [];
  // eslint-disable-next-line typescript/unbound-method
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; });
  try { await cmdSettingsNotify(args); } finally { process.stdout.write = originalWrite; }
  return output.join("");
}

describe("orch settings notify", () => {
  test("records a sink with the field that sink declares", async () => {
    await captureNotify(["add", "webhook", "--url=https://example.test/hook"]);
    expect(loadConfig(root).notify).toEqual([{ id: "webhook", url: "https://example.test/hook" }]);
  });

  test("re-adding one sink replaces it in place and keeps the fields the call omits", async () => {
    await captureNotify(["add", "command", "--command=logger -t orch"]);
    await captureNotify(["add", "desktop"]);
    await captureNotify(["add", "command", "--on=blocked,error,done"]);

    expect(loadConfig(root).notify).toEqual([
      { id: "command", command: "logger -t orch", on: ["blocked", "error", "done"] },
      { id: "desktop" },
    ]);
  });

  test("accepts asking as a first-class sink state", async () => {
    await captureNotify(["add", "command", "--command=logger -t orch", "--on=asking"]);
    expect(loadConfig(root).notify).toEqual([
      { id: "command", command: "logger -t orch", on: ["asking"] },
    ]);
  });

  test("remove drops only the named sink", async () => {
    await captureNotify(["add", "desktop"]);
    await captureNotify(["add", "webhook", "--url=https://example.test/hook"]);
    await captureNotify(["remove", "desktop"]);

    expect(loadConfig(root).notify).toEqual([{ id: "webhook", url: "https://example.test/hook" }]);
  });

  test("list reports each sink with the states it fires on, defaults included", async () => {
    await captureNotify(["add", "desktop"]);
    await captureNotify(["add", "webhook", "--url=https://example.test/hook", "--on=done"]);

    const listed = await captureNotify([]);
    expect(listed).toContain("desktop   blocked,error");
    expect(listed).toContain("webhook   done");
    expect(listed).toContain("https://example.test/hook");
    expect(await captureNotify(["--json"])).toContain("\"id\": \"webhook\"");
  });

  test("an empty notify array lists as none configured", async () => {
    expect(await captureNotify(["list"])).toContain("(none configured)");
  });
});
