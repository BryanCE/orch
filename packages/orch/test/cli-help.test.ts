import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HELP_HEADER, renderMap, renderTopic } from "../src/cli/help.ts";
import { readHelpDoc } from "../src/cli/doc.ts";
import { COMMANDS, GLOBAL_FLAGS, commandSpec } from "../src/commands/registry.ts";
import { commandHandlers, helpTopic } from "../src/commands/index.ts";
import { checkHelpDocs } from "../src/doctor/help-docs.ts";
import type { CommandSpec } from "../src/cli/spec.ts";

const GOLDEN = join(import.meta.dirname, "golden", "help.txt");

const SPEC: CommandSpec = {
  name: "demo", section: "observe",
  usage: "orch demo <target> [--tab <label>]",
  summary: "A demo.",
  flags: [
    { name: "--tab", arity: "one", placeholder: "<label>", help: "The tab." },
    { name: "--file", arity: "many", placeholder: "<path>", help: "A file." },
    { name: "--yes", aliases: ["-y"], arity: "none", help: "Yes." },
  ],
  subcommands: [
    { name: "sub", usage: "orch demo sub [--json]", summary: "A subcommand.", flags: [{ name: "--json", arity: "none", help: "JSON." }] },
  ],
};

describe("help from the registry", () => {
  test("every handler word names a spec, and every spec has a handler", () => {
    for (const word of Object.keys(commandHandlers)) expect(commandSpec(word)?.name, word).toBeDefined();
    for (const spec of COMMANDS) expect(commandHandlers[spec.name], spec.name).toBeDefined();
  });

  test("the map equals the golden file", () => {
    expect(renderMap(COMMANDS)).toBe(readFileSync(GOLDEN, "utf8"));
  });

  test("the map starts with the header and lists every top-level usage under its section", () => {
    const map = renderMap(COMMANDS);
    expect(map.startsWith(HELP_HEADER)).toBe(true);
    for (const spec of COMMANDS) expect(map, spec.name).toContain(`  ${spec.usage}`);
    expect(map.indexOf("OBSERVE")).toBeLessThan(map.indexOf("DISPATCH"));
    expect(map.indexOf("AGENTS")).toBeLessThan(map.indexOf("MAINTENANCE"));
  });

  test("a topic prints usage, doc, the flag table with spellings and placeholders, subcommands, then globals", () => {
    const topic = renderTopic(SPEC, { text: "Doctrine here." }, GLOBAL_FLAGS);
    expect(topic.startsWith("orch demo <target> [--tab <label>]\n\nDoctrine here.\n\nFlags:\n")).toBe(true);
    expect(topic).toContain("  --tab <label>");
    expect(topic).toContain("  --file <path>...");
    expect(topic).toContain("  -y, --yes");
    expect(topic).toContain("\nSubcommands:\n  orch demo sub [--json]\n      A subcommand.\n      --json");
    expect(topic).toContain("\nGlobal:\n  -h, --help");
    expect(topic.indexOf("Subcommands:")).toBeLessThan(topic.indexOf("Global:"));
    expect(topic.endsWith("\n")).toBe(true);
  });

  test("a missing doc names the path and never throws", () => {
    const topic = renderTopic(SPEC, { missing: "/nowhere/demo.md" }, GLOBAL_FLAGS);
    expect(topic).toContain("/nowhere/demo.md is missing");
    expect(topic).toContain("Flags:");
  });

  test("every shipped command has a doc that reads back, and doctor agrees", () => {
    for (const spec of COMMANDS) expect("text" in readHelpDoc(spec.name), spec.name).toBe(true);
    expect(checkHelpDocs().status).toBe("ok");
  });

  test("helpTopic resolves aliases and refuses unknown words", () => {
    expect(helpTopic("kill")).toBe(helpTopic("close"));
    expect(helpTopic("spawn")).toContain("--tab <label>");
    expect(helpTopic("nope")).toBeNull();
  });
});
