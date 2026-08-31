import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseTargetPrompt, resultText, splitOptionFlags, remoteCommandArgs, livePanePresenceEntries } from "../src/commands/target.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

describe("commands/target", () => {
  test("splits known flags and preserves positional args", () => {
    expect(splitOptionFlags(["--json", "agent", "--all"], ["--json", "--all"])).toEqual({ enabled: new Set(["--json", "--all"]), positional: ["agent"] });
  });
  test("extracts target and joined prompt", () => expect(parseTargetPrompt(["agent", "do", "the", "thing"], "--raw", "usage")).toEqual({ target: "agent", prompt: "do the thing" }));
  test("reads only structured result text", () => {
    expect(resultText({ text: "done" })).toBe("done");
    expect(resultText({ text: 1 })).toBeUndefined();
    expect(resultText(null)).toBeUndefined();
  });
  test("quotes remote args and ORCH_DIR safely", () => expect(remoteCommandArgs({ orch_dir: "/tmp/a b", timeout_ms: 1 } as never, "result", ["a'b"])).toBe("env ORCH_DIR='/tmp/a b' orch 'result' 'a'\\''b'"));
  test("lists only live serialized identity presence entries", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-target-"));
    const old = process.env.ORCH_DIR; process.env.ORCH_DIR = root;
    try {
      // Only a minted id names an agent; a plexer/space key names an environment.
      for (const [key, pid] of [["live000001", process.pid], ["not-an-identity", process.pid], ["dead000001", 999999]] as const) {
        seedStatus(root, key, { key, pid });
      }
      expect(livePanePresenceEntries().map((entry) => entry.key)).toEqual(["live000001"]);
    } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });
});
