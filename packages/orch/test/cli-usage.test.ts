import { describe, expect, test } from "bun:test";
import { UsageError } from "../src/cli/spec.ts";
import { flagUsage, synopsis, usageError, usageLine } from "../src/cli/usage.ts";
import type { CommandSpec } from "../src/cli/spec.ts";

const RESET: CommandSpec = {
  name: "reset", args: "<target>... | --all",
  summary: "Fresh session.",
  flags: [
    { name: "--all", arity: "none", help: "Every agent." },
    { name: "--model", arity: "one", placeholder: "<model[:thinking]>", help: "Model." },
    { name: "--with", arity: "many", placeholder: "<path>", help: "Context." },
  ],
};

const MOVE: CommandSpec = {
  name: "move", args: "<target> --tab <tab> | --new-tab",
  summary: "Move.",
  flags: [
    { name: "--tab", arity: "one", placeholder: "<tab>", help: "Tab." },
    { name: "--new-tab", arity: "none", help: "Fresh tab." },
    { name: "--label", arity: "one", placeholder: "<label>", help: "Label." },
  ],
};

const PARENT: CommandSpec = {
  name: "space", summary: "Spaces.", flags: [],
  subcommands: [
    { name: "list", summary: "List.", flags: [] },
    { name: "delete", args: "<space>", summary: "Delete.", flags: [] },
  ],
};

describe("usage from the spec", () => {
  test("a flag renders by arity", () => {
    expect(flagUsage({ name: "--json", arity: "none", help: "." })).toBe("[--json]");
    expect(flagUsage({ name: "--tab", arity: "one", placeholder: "<tab>", help: "." })).toBe("[--tab <tab>]");
    expect(flagUsage({ name: "--with", arity: "many", placeholder: "<path>", help: "." })).toBe("[--with <path>]...");
  });

  test("the usage line is the grammar, then every flag the grammar does not name", () => {
    expect(usageLine(RESET, ["reset"])).toBe("orch reset <target>... | --all [--model <model[:thinking]>] [--with <path>]...");
  });

  test("a flag named in the grammar is not repeated, and a longer name sharing a suffix does not count", () => {
    expect(usageLine(MOVE, ["move"])).toBe("orch move <target> --tab <tab> | --new-tab [--label <label>]");
  });

  test("a parent with no grammar offers its subcommand words", () => {
    expect(synopsis(PARENT, ["space"])).toBe("orch space <list|delete>");
    expect(usageLine(PARENT.subcommands![1]!, ["space", "delete"])).toBe("orch space delete <space>");
  });

  test("usageError is a UsageError carrying the reason, then the generated usage", () => {
    const refused = usageError({ command: RESET, path: ["reset"] }, "no target");
    expect(refused).toBeInstanceOf(UsageError);
    expect(refused.message).toBe("no target\nusage: orch reset <target>... | --all [--model <model[:thinking]>] [--with <path>]...");
    expect(usageError({ command: MOVE, path: ["move"] }).message).toBe("usage: orch move <target> --tab <tab> | --new-tab [--label <label>]");
  });
});
