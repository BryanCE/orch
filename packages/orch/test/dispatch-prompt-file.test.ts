import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseDispatchFlags, promptBody } from "../src/commands/control.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

const tempDirs: string[] = [];

function specFile(body: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orch-prompt-file-"));
  tempDirs.push(dir);
  const file = path.join(dir, "spec.md");
  fs.writeFileSync(file, body);
  return file;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) removeTempDir(dir);
});

describe("a dispatch prompt can come from a file instead of argv", () => {
  test("--file is parsed off the positionals", () => {
    const flags = parseDispatchFlags(["api-types", "--file", "spec.md"]);
    expect(flags.promptFile).toBe("spec.md");
    expect(flags.positional).toEqual(["api-types"]);
  });

  test("the file body is the prompt, apostrophes and newlines intact", () => {
    const file = specFile("rename `HostConfig`\ndon't touch the adapter's wire format\n");
    expect(promptBody({ promptFile: file, positional: ["api-types"] }))
      .toBe("rename `HostConfig`\ndon't touch the adapter's wire format");
  });

  test("without --file the positionals after the target are the prompt", () => {
    expect(promptBody({ positional: ["api-types", "rename", "HostConfig"] })).toBe("rename HostConfig");
  });

  test("a typed prompt and --file together is a refusal, never a silent winner", () => {
    const file = specFile("from the file");
    expect(() => promptBody({ promptFile: file, positional: ["api-types", "typed"] }))
      .toThrow(/arguments or as --file, not both/i);
  });

  test("an empty file is refused: a dispatch with no prompt is not a dispatch", () => {
    expect(() => promptBody({ promptFile: specFile("   \n"), positional: ["api-types"] }))
      .toThrow(/is empty/i);
  });

  test("a missing file names itself in the refusal", () => {
    expect(() => promptBody({ promptFile: path.join(os.tmpdir(), "orch-no-such-spec.md"), positional: ["api-types"] }))
      .toThrow(/could not read the prompt from .*orch-no-such-spec\.md/i);
  });
});
