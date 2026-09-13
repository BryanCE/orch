import type { OrchDir } from "../src/types/core.ts";
import { orchDirAt } from "../src/services.ts";
import { describe, expect, test } from "bun:test";
import { parseTargetPrompt, resultText, splitOptionFlags, remoteCommandArgs, livePanePresenceEntries } from "../src/commands/target.ts";
import { seedAgent, seedLiveProcess } from "./helpers/agent.ts";
import { seedStatus } from "./helpers/presence.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";

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
    const root: OrchDir = tempOrchDir("orch-command-target-");
    const old: OrchDir | undefined = process.env.ORCH_DIR === undefined ? undefined : orchDirAt(process.env.ORCH_DIR); process.env.ORCH_DIR = root;
    try {
      // Only a minted id names an agent; a plexer/space key names an environment. The store says who is live.
      seedAgent("live000001", {}, root);
      seedLiveProcess(root, "live000001");
      seedAgent("dead000001", {}, root);
      for (const key of ["live000001", "not-an-identity", "dead000001"]) seedStatus(root, key, { key });
      expect(livePanePresenceEntries(root).map((entry) => entry.key)).toEqual(["live000001"]);
    } finally { if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; removeTempDir(root); }
  });
});
