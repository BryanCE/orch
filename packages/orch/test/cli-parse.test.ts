import { describe, expect, test } from "bun:test";
import { parseInvocation } from "../src/cli/parse.ts";
import { UsageError } from "../src/cli/spec.ts";
import type { CommandSpec } from "../src/cli/spec.ts";

const SPEC: CommandSpec = {
  name: "spawn",
  args: "<name>...",
  summary: "One fleet.",
  flags: [
    { name: "--tab", arity: "one", placeholder: "<tab>", help: "The tab." },
    { name: "--file", arity: "many", placeholder: "<path>", help: "A task file." },
    { name: "--json", arity: "none", help: "JSON." },
    { name: "--yes", aliases: ["-y"], arity: "none", help: "Yes." },
  ],
};

const PARENT: CommandSpec = {
  name: "settings",
  summary: "Settings.",
  flags: [{ name: "--json", arity: "none", help: "JSON." }],
  subcommands: [
    {
      name: "notify",
      summary: "Sinks.",
      flags: [],
      subcommands: [
        { name: "add", args: "<sink>", summary: "Add.", flags: [{ name: "--only", arity: "one", placeholder: "<state,...>", help: "States." }], openFlags: true },
      ],
    },
  ],
};

describe("parseInvocation", () => {
  test("positionals stay in order and no-value flags read as has()", () => {
    const parsed = parseInvocation(SPEC, ["a", "b", "--json", "c"]);
    expect(parsed.positional).toEqual(["a", "b", "c"]);
    expect(parsed.flags.has("--json")).toBe(true);
    expect(parsed.flags.has("--yes")).toBe(false);
    expect(parsed.path).toEqual(["spawn"]);
  });

  test("a one-value flag takes the next token or the assignment", () => {
    expect(parseInvocation(SPEC, ["--tab", "api"]).flags.value("--tab")).toBe("api");
    expect(parseInvocation(SPEC, ["--tab=api"]).flags.value("--tab")).toBe("api");
    expect(parseInvocation(SPEC, []).flags.value("--tab")).toBeUndefined();
  });

  test("the value token is taken even when it starts with a dash", () => {
    expect(parseInvocation(SPEC, ["--file", "-"]).flags.values("--file")).toEqual(["-"]);
  });

  test("a many-value flag collects in argv order, in both syntaxes", () => {
    const parsed = parseInvocation(SPEC, ["--file", "a.md", "--file=b.md", "x", "--file", "c.md"]);
    expect(parsed.flags.values("--file")).toEqual(["a.md", "b.md", "c.md"]);
    expect(parsed.positional).toEqual(["x"]);
    expect(parseInvocation(SPEC, []).flags.values("--file")).toEqual([]);
  });

  test("an alias records under the long name", () => {
    expect(parseInvocation(SPEC, ["-y"]).flags.has("--yes")).toBe(true);
  });

  test("a repeated one-value flag keeps the last value", () => {
    expect(parseInvocation(SPEC, ["--tab", "a", "--tab", "b"]).flags.value("--tab")).toBe("b");
  });

  test("an unknown flag is refused with the usage line built from the spec", () => {
    expect(() => parseInvocation(SPEC, ["--nope"])).toThrow(UsageError);
    expect(() => parseInvocation(SPEC, ["--nope"])).toThrow("unknown flag --nope\nusage: orch spawn <name>... [--tab <tab>] [--file <path>]... [--json] [--yes]");
  });

  test("a refusal inside a subcommand names the full command path", () => {
    expect(() => parseInvocation(PARENT, ["notify", "--url=x"])).toThrow("unknown flag --url\nusage: orch settings notify <add>");
  });

  test("a one-value flag at the end of argv is refused", () => {
    expect(() => parseInvocation(SPEC, ["--tab"])).toThrow(/--tab needs a value <tab>/);
  });

  test("a no-value flag with an assignment is refused", () => {
    expect(() => parseInvocation(SPEC, ["--json=1"])).toThrow(/--json takes no value/);
  });

  test("a global flag is accepted on any command", () => {
    const parsed = parseInvocation(SPEC, ["--stale-ok"], [{ name: "--stale-ok", arity: "none", help: "Skew." }]);
    expect(parsed.flags.has("--stale-ok")).toBe(true);
  });

  test("a subcommand word routes to the child and the path records the route", () => {
    const parsed = parseInvocation(PARENT, ["notify", "add", "webhook", "--only=done", "--url=http://x"]);
    expect(parsed.path).toEqual(["settings", "notify", "add"]);
    expect(parsed.command.name).toBe("add");
    expect(parsed.positional).toEqual(["webhook"]);
    expect(parsed.flags.value("--only")).toBe("done");
    expect(parsed.undeclared.get("--url")).toBe("http://x");
  });

  test("openFlags keeps an undeclared flag as bare, assigned, or with the next token", () => {
    const parsed = parseInvocation(PARENT, ["notify", "add", "cmd", "--command", "say hi", "--quiet", "--only", "done"]);
    expect(parsed.undeclared.get("--command")).toBe("say hi");
    expect(parsed.undeclared.get("--quiet")).toBe(true);
    expect(parsed.flags.value("--only")).toBe("done");
  });

  test("a closed spec refuses an undeclared flag and reports nothing undeclared", () => {
    expect(() => parseInvocation(PARENT, ["notify", "--url=x"])).toThrow(UsageError);
    expect(parseInvocation(PARENT, ["--json"]).undeclared.size).toBe(0);
  });

  test("no subcommand word stays on the parent", () => {
    const parsed = parseInvocation(PARENT, ["--json"]);
    expect(parsed.command.name).toBe("settings");
    expect(parsed.path).toEqual(["settings"]);
    expect(parsed.flags.has("--json")).toBe(true);
  });
});
