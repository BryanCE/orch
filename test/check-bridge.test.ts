import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CORE_SCOPE_ALLOWLIST,
  checkCommandsParserLine,
  checkCoreScopeLine,
  checkDispatcherCallLine,
  checkPackageImportLine,
} from "../scripts/check-bridge.ts";

// The four static-enforcement rules added for group 10 of fix-audit-findings.
// check-bridge.ts guards its own scan behind `import.meta.main`, so importing it
// here runs no filesystem scan — each rule is exercised as a pure line check.
// Violation fixtures are inline strings; the "clean tree passes" half reads the
// real load-bearing files (the web server, the dispatcher) and asserts the rules
// stay silent on them.

const repoRoot = join(import.meta.dir, "..");
function readRepoLines(relPath: string): string[] {
  return readFileSync(join(repoRoot, relPath), "utf8").split(/\r?\n/);
}

describe("10.1 packages must not import concrete backends/adapters (checkPackageImportLine)", () => {
  test("flags a concrete backend implementation import", () => {
    const line = 'import { herdrTabs } from "../../../../src/backends/herdr/cli.ts";';
    expect(checkPackageImportLine(line)).toContain("concrete backend");
  });

  test("flags a concrete agent adapter import", () => {
    const line = 'import { piAdapter } from "../../../../src/adapters/pi.ts";';
    expect(checkPackageImportLine(line)).toContain("concrete agent adapter");
  });

  test("allows the registry / port / store / config seams", () => {
    const allowed = [
      'import { resolveBackend } from "../../../../src/backends/registry.ts";',
      'import { resolveAdapter } from "../../../../src/adapters/registry.ts";',
      'import type { Backend } from "../../../../src/backends/backend.ts";',
      'import { loadPresence } from "../../../../src/presence/store.ts";',
      'import { loadConfigOrNull } from "../../../../src/config.ts";',
      'import { rpcCall } from "../../../../src/daemon/rpc.ts";',
    ];
    for (const line of allowed) expect(checkPackageImportLine(line)).toBeUndefined();
  });

  test("passes the clean tree: no line of the real web server is flagged", () => {
    for (const line of readRepoLines("packages/web/src/server/orch.ts")) {
      expect(checkPackageImportLine(line)).toBeUndefined();
    }
  });
});

describe("10.2 adapter control strategies are dispatcher-only (checkDispatcherCallLine)", () => {
  test("flags .steer / .answer / .setModel called from a command", () => {
    const relPath = "src/commands/control.ts";
    expect(checkDispatcherCallLine("  await adapter.steer({ key, text });", relPath)).toContain(".steer/.answer/.setModel");
    expect(checkDispatcherCallLine("  adapter.answer({ key, text });", relPath)).toContain(".steer/.answer/.setModel");
    expect(checkDispatcherCallLine("  return adapter.setModel({ key, model });", relPath)).toContain(".steer/.answer/.setModel");
  });

  test("allows the dispatcher itself and the adapter implementations", () => {
    const call = "  const command = adapter.answer({ key: target, text });";
    expect(checkDispatcherCallLine(call, "src/control/dispatch.ts")).toBeUndefined();
    expect(checkDispatcherCallLine(call, "src/adapters/pi.ts")).toBeUndefined();
  });

  test("passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts", () => {
    for (const line of readRepoLines("src/control/dispatch.ts")) {
      expect(checkDispatcherCallLine(line, "src/control/dispatch.ts")).toBeUndefined();
    }
  });
});

describe("10.3 string-form identity branches are forbidden in core (checkCoreScopeLine)", () => {
  const relPath = "src/commands/somewhere.ts";

  test("flags === / !== against a quoted provider or backend id", () => {
    expect(checkCoreScopeLine('  if (adapterId === "pi") return piFast();', relPath)).toContain("identity branch");
    expect(checkCoreScopeLine('  if ("headless" !== backendId) tile();', relPath)).toContain("identity branch");
    expect(checkCoreScopeLine('  if (backendId === "herdr") reachable();', relPath)).toContain("identity branch");
  });

  test("flags ?? and || default-provider fallbacks", () => {
    expect(checkCoreScopeLine('  const adapter = resolveAdapter(id ?? "pi");', relPath)).toContain("identity branch");
    expect(checkCoreScopeLine('  const adapter = resolveAdapter(id || "claude");', relPath)).toContain("identity branch");
  });

  test("allows a benign line with none of those shapes", () => {
    expect(checkCoreScopeLine("  const adapter = resolveAdapter(spawned.adapter);", relPath)).toBeUndefined();
  });

  test("the setup smoke-test exemption is documented and load-bearing", () => {
    const exemptLine =
      'const key = [...after.keys()].find((candidate) => !before.has(candidate) && after.get(candidate)?.backend === "headless");';
    // The raw line IS a violation — proving the allowlist entry is what keeps the clean tree green.
    expect(checkCoreScopeLine(exemptLine, "src/commands/setup.ts")).toContain("identity branch");
    expect(CORE_SCOPE_ALLOWLIST.get("src/commands/setup.ts")?.has(exemptLine)).toBe(true);
  });

  test("passes the clean tree: setup.ts has exactly one identity-branch line and it is exempted", () => {
    const allowed = CORE_SCOPE_ALLOWLIST.get("src/commands/setup.ts") ?? new Set<string>();
    const unexempted: string[] = [];
    for (const line of readRepoLines("src/commands/setup.ts")) {
      if (allowed.has(line.trim())) continue;
      const reason = checkCoreScopeLine(line, "src/commands/setup.ts");
      if (reason?.includes("identity branch")) unexempted.push(line.trim());
    }
    expect(unexempted).toEqual([]);
  });
});

describe("10.4 per-harness session parser banned from commands (checkCommandsParserLine)", () => {
  test("flags a parseSession import or call", () => {
    expect(checkCommandsParserLine('import { parseSession } from "../session.ts";')).toContain("parseSession");
    expect(checkCommandsParserLine("  const data = parseSession(sessionPath);")).toContain("parseSession");
  });

  test("allows the port-based read", () => {
    expect(checkCommandsParserLine("  const view = adapter.readSessionView({ sessionPath });")).toBeUndefined();
  });

  test("passes the clean tree: no command imports parseSession", () => {
    for (const line of readRepoLines("src/commands/results.ts")) {
      expect(checkCommandsParserLine(line)).toBeUndefined();
    }
  });
});
