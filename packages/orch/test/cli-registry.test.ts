import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COMMANDS, GLOBAL_FLAGS, commandSpec } from "../src/commands/registry.ts";
import { usageLine } from "../src/cli/usage.ts";
import type { CommandSpec, FlagSpec } from "../src/cli/spec.ts";

const HELP_DIR = join(import.meta.dirname, "..", "help");

/** Every spec in the tree, parents first, with the path that reaches it. */
function walk(specs: readonly CommandSpec[], prefix: readonly string[] = []): { path: string; spec: CommandSpec }[] {
  return specs.flatMap((spec) => {
    const path = [...prefix, spec.name].join(" ");
    return [{ path, spec }, ...walk(spec.subcommands ?? [], [...prefix, spec.name])];
  });
}

const EVERY = walk(COMMANDS);

function spellings(flag: FlagSpec): string[] {
  return [flag.name, ...(flag.aliases ?? [])];
}

describe("command registry", () => {
  test("every spec has a generated usage line that starts with its path, and a summary", () => {
    for (const { path, spec } of EVERY) {
      expect(usageLine(spec, path.split(" ")), path).toMatch(new RegExp(`^orch ${path}( |$)`));
      expect(spec.summary.length, path).toBeGreaterThan(0);
    }
  });

  test("--json is global and never declared per command", () => {
    expect(GLOBAL_FLAGS.flatMap(spellings)).toContain("--json");
  });

  test("no spec declares a retired flag spelling", () => {
    const retired = ["--adapter", "--backend", "--agent-id", "--force", "--all-panes", "--space-wide", "--cross-space", "--filter", "--list", "--workspace", "--on", "--off", "--toggle"];
    for (const { path, spec } of EVERY) {
      for (const spelling of spec.flags.flatMap(spellings)) expect(retired.includes(spelling), `${path} ${spelling}`).toBe(false);
    }
  });

  test("one flag has one placeholder across every command", () => {
    const placeholders = new Map<string, Set<string>>();
    for (const { spec } of EVERY) {
      for (const flag of spec.flags) {
        if (flag.placeholder === undefined) continue;
        const seen = placeholders.get(flag.name) ?? new Set<string>();
        seen.add(flag.placeholder);
        placeholders.set(flag.name, seen);
      }
    }
    expect(placeholders.get("--agent")).toEqual(new Set(["<target>"]));
    expect(placeholders.get("-n")).toEqual(new Set(["<count>"]));
    expect(placeholders.get("--space")).toEqual(new Set(["<space>"]));
    expect(placeholders.get("--tab")).toEqual(new Set(["<tab>"]));
    expect(placeholders.get("--since")).toEqual(new Set(["<duration>"]));
    expect(placeholders.get("--timeout")).toEqual(new Set(["<duration>"]));
  });

  test("lists are 'orch <noun> list'", () => {
    for (const noun of ["tab", "pane", "grant", "queue", "review", "space"]) {
      expect(commandSpec(noun)?.subcommands?.some((child) => child.name === "list"), noun).toBe(true);
    }
    for (const retired of ["tabs", "panes", "run"]) expect(commandSpec(retired), retired).toBeUndefined();
  });

  test("every flag has a help line, and a placeholder when it takes a value", () => {
    for (const { path, spec } of EVERY) {
      for (const flag of [...spec.flags, ...GLOBAL_FLAGS]) {
        expect(flag.help.length, `${path} ${flag.name}`).toBeGreaterThan(0);
        expect(flag.name, `${path} ${flag.name}`).toMatch(/^--?[a-z]/);
        if (flag.arity !== "none") expect(flag.placeholder, `${path} ${flag.name}`).toBeDefined();
        else expect(flag.placeholder, `${path} ${flag.name}`).toBeUndefined();
      }
    }
  });

  test("no spec declares one spelling twice, or shadows a global flag", () => {
    const globalSpellings = GLOBAL_FLAGS.flatMap(spellings);
    for (const { path, spec } of EVERY) {
      const seen = new Set<string>();
      for (const spelling of spec.flags.flatMap(spellings)) {
        expect(seen.has(spelling), `${path} ${spelling}`).toBe(false);
        expect(globalSpellings.includes(spelling), `${path} ${spelling}`).toBe(false);
        seen.add(spelling);
      }
    }
  });

  test("every top-level command has a section and a unique word; subcommands have neither a section nor a clash", () => {
    const words = new Set<string>();
    for (const spec of COMMANDS) {
      expect(spec.section, spec.name).toBeDefined();
      for (const word of [spec.name, ...(spec.aliases ?? [])]) {
        expect(words.has(word), word).toBe(false);
        words.add(word);
      }
    }
    for (const { path, spec } of EVERY) {
      if (COMMANDS.includes(spec)) continue;
      expect(spec.section, path).toBeUndefined();
    }
    for (const { path, spec } of EVERY) {
      const childWords = (spec.subcommands ?? []).flatMap((child) => [child.name, ...(child.aliases ?? [])]);
      expect(new Set(childWords).size, path).toBe(childWords.length);
    }
  });

  test("every top-level command has a non-empty doc file in help/", () => {
    for (const spec of COMMANDS) {
      const doc = join(HELP_DIR, `${spec.name}.md`);
      expect(existsSync(doc), doc).toBe(true);
      expect(readFileSync(doc, "utf8").trim().length, doc).toBeGreaterThan(0);
    }
  });

  test("a command word resolves by name or alias", () => {
    expect(commandSpec("close")?.name).toBe("close");
    expect(commandSpec("kill")?.name).toBe("close");
    expect(commandSpec("new")?.name).toBe("reset");
    expect(commandSpec("-V")?.name).toBe("version");
    expect(commandSpec("-h")?.name).toBe("help");
    expect(commandSpec("nope")).toBeUndefined();
  });
});
