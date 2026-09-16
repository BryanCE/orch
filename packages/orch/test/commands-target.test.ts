import { describe, expect, test } from "bun:test";
import { resultText, remoteCommandArgs } from "../src/commands/target.ts";

describe("commands/target", () => {
  test("reads only structured result text", () => {
    expect(resultText({ text: "done" })).toBe("done");
    expect(resultText({ text: 1 })).toBeUndefined();
    expect(resultText(null)).toBeUndefined();
  });
  test("quotes remote args and ORCH_DIR safely", () => expect(remoteCommandArgs({ orch_dir: "/tmp/a b", timeout_ms: 1 } as never, "result", ["a'b"])).toBe("env ORCH_DIR='/tmp/a b' orch 'result' 'a'\\''b'"));
});
