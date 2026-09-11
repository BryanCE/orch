import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { parseDispatchFlags, promptBody } from "../src/commands/control.ts";
import { contextReference } from "../src/commands/prompt-file.ts";
import { taskWithReferences } from "../src/worker-prompt.ts";
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

describe("--with points the agent at context it opens on demand", () => {
  test("--with is repeatable and parsed off the positionals", () => {
    const flags = parseDispatchFlags(["api-types", "do it", "--with", "docs", "--with", "src/a.ts"]);
    expect(flags.withPaths).toEqual(["docs", "src/a.ts"]);
    expect(flags.positional).toEqual(["api-types", "do it"]);
  });

  test("a file reference is absolute and typed as a file", () => {
    const file = specFile("spec");
    expect(contextReference(path.relative(process.cwd(), file))).toEqual({ path: file, kind: "file" });
  });

  test("a directory reference is typed as a directory", () => {
    const dir = path.dirname(specFile("spec"));
    expect(contextReference(dir)).toEqual({ path: dir, kind: "directory" });
  });

  test("a missing path dies at dispatch, naming the flag", () => {
    expect(() => contextReference(path.join(os.tmpdir(), "orch-no-such-context")))
      .toThrow(/--with .*orch-no-such-context/);
  });

  test("the task tells the agent where to look and to open paths only when needed; content is never inlined", () => {
    const task = taskWithReferences("rename HostConfig", [
      { path: "/repo/docs", kind: "directory" },
      { path: "/repo/src/a.ts", kind: "file" },
    ]);
    expect(task).toBe(
      "Context for this task lives at the paths below. Open a path only when the task needs it; do not read them all up front.\n"
      + "- /repo/docs (directory: list it, then open only the files that apply)\n"
      + "- /repo/src/a.ts\n\n"
      + "rename HostConfig",
    );
  });

  test("no references leaves the instructions untouched", () => {
    expect(taskWithReferences("rename HostConfig", [])).toBe("rename HostConfig");
  });
});
