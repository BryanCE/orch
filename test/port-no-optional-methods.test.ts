import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// TASKS/07-port-seam.md slice 9: "Delete the shell." An optional method on the port
// is a capability declared by whether a method exists, which E13 deletes outright —
// so the finished port has ZERO of them. This is the check that keeps it at zero:
// the next optional method added is a compile-time-invisible regression, and only a
// test over the port's own text catches it.
describe("the environment port declares capability by composition, never by optionality", () => {
  test("src/types/backend.ts has no optional methods on any port interface", () => {
    const source = readFileSync(join(import.meta.dir, "../src/types/backend.ts"), "utf8");
    const optionalMethods = source
      .split("\n")
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter((entry) => /^[A-Za-z_$][\w$]*\?\s*\(/.test(entry.line));

    expect(optionalMethods.map((entry) => `${entry.number}: ${entry.line}`)).toEqual([]);
  });

  // Rule 8: pre-publish there is exactly ONE current shape. `BackendCapabilities`
  // was the flags bag E13 deleted; leaving the interface declared after removing
  // its last implementer keeps a second way to say capability alive, ready for the
  // next author to reach for.
  test("the deleted capability flags bag is gone, not merely unimplemented", () => {
    const source = readFileSync(join(import.meta.dir, "../src/types/backend.ts"), "utf8");
    // The DECLARATION, not the word: the comment on LogPruningRole names the
    // boolean it replaced, and that history is worth keeping.
    expect(source).not.toContain("interface BackendCapabilities");
    expect(source).not.toMatch(/readonly canPruneLogs\s*:/);
  });

  test("src/adapters/adapter.ts has no optional methods on the harness port either", () => {
    const source = readFileSync(join(import.meta.dir, "../src/adapters/adapter.ts"), "utf8");
    const optionalMethods = source
      .split("\n")
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter((entry) => /^[A-Za-z_$][\w$]*\?\s*\(/.test(entry.line));

    expect(optionalMethods.map((entry) => `${entry.number}: ${entry.line}`)).toEqual([]);
  });
});
