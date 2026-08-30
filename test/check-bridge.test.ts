import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CORE_SCOPE_ALLOWLIST,
  IDENTITY_CONSTRUCTION_ALLOWLIST,
  checkCommandsParserLine,
  checkBridgeBundleImportLine,
  checkIdentityConstructionLine,
  checkCoreScopeLine,
  checkDispatcherCallLine,
  checkPackageImportLine,
  checkSpawnerReplyFallbackLine,
  checkLeaseProvenanceLine,
  checkEnvironmentCapabilityLine,
  checkLaunchEnvLine,
  checkPlexerLiteralLine,
  ENVIRONMENT_ROLE_NAMES,
} from "../scripts/check-bridge.ts";

// The static-enforcement rules added for group 10 of fix-audit-findings.
// check-bridge.ts guards its own scan behind `import.meta.main`, so importing it
// here runs no filesystem scan — each rule is exercised as a pure line check.
// Violation fixtures are inline strings; the "clean tree passes" half reads the
// real load-bearing files (the web server, the dispatcher) and asserts the rules
// stay silent on them.

const repoRoot = join(import.meta.dir, "..");
function readRepoLines(relPath: string): string[] {
  return readFileSync(join(repoRoot, relPath), "utf8").split(/\r?\n/);
}

function sourceFiles(relDir: string): string[] {
  const directory = join(repoRoot, relDir);
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(relDir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(path);
  }
  return files;
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

  test("allows the shared harness model port outside the adapter dispatcher", () => {
    expect(checkDispatcherCallLine("  await harness.setModel(model);", "src/agent/model-control.ts")).toBeUndefined();
  });

  test("passes the clean tree: every .steer/.answer/.setModel call lives in dispatch.ts", () => {
    for (const line of readRepoLines("src/control/dispatch.ts")) {
      expect(checkDispatcherCallLine(line, "src/control/dispatch.ts")).toBeUndefined();
    }
  });
});

describe("10.3 bridge bundles stay in build tooling (checkBridgeBundleImportLine)", () => {
  test("flags a runtime adapter importing bridge-bundle.ts", () => {
    expect(checkBridgeBundleImportLine(
      'import { buildExtensionBundle } from "../bridge-bundle.ts";',
      "src/adapters/pi.ts",
    )).toContain("build tooling");
  });

  test("allows scripts and the build-tool module itself", () => {
    expect(checkBridgeBundleImportLine(
      'import { EXTENSION_NAMES } from "../src/bridge-bundle.ts";',
      "scripts/reset.ts",
    )).toBeUndefined();
    expect(checkBridgeBundleImportLine(
      'import { extensionBundlePath } from "./extensions/bundles.ts";',
      "src/bridge-bundle.ts",
    )).toBeUndefined();
  });
});

describe("10.4 string-form identity branches are forbidden in core (checkCoreScopeLine)", () => {
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

  test("the setup smoke test holds no exemption: the branch was deleted, not blessed", () => {
    // The shape the smoke test used to carry. It IS still a violation — the rule did not
    // soften — but setup.ts no longer contains it, so nothing exempts it any more (Rule 11:
    // branch on declared capabilities, never on an environment id).
    const formerlyExemptLine =
      'const key = after.find((view) => !before.has(view.id) && view.environment.plexer === "headless")?.id;';
    expect(checkCoreScopeLine(formerlyExemptLine, "src/commands/setup.ts")).toContain("identity branch");
    expect(CORE_SCOPE_ALLOWLIST.get("src/commands/setup.ts")).toBeUndefined();
    expect(CORE_SCOPE_ALLOWLIST.size).toBe(0);
  });

  test("passes the clean tree: setup.ts has no identity-branch line, exempted or otherwise", () => {
    const unexempted: string[] = [];
    for (const line of readRepoLines("src/commands/setup.ts")) {
      const reason = checkCoreScopeLine(line, "src/commands/setup.ts");
      if (reason?.includes("identity branch")) unexempted.push(line.trim());
    }
    expect(unexempted).toEqual([]);
  });
});

describe("10.4 spawner reply addresses cannot fall back to owner tokens (checkSpawnerReplyFallbackLine)", () => {
  test("flags spawner key and spawnerIdentity key owner-token fallbacks", () => {
    expect(checkSpawnerReplyFallbackLine("  spawnedBy: spawner.key ?? callerOwnerToken(),")).toContain("owner token");
    expect(checkSpawnerReplyFallbackLine("  return spawnerIdentity().key || ORCH_OWNER;")).toContain("owner token");
  });

  test("allows a benign line", () => {
    expect(checkSpawnerReplyFallbackLine("  spawnedBy: spawner.key ?? undefined;")).toBeUndefined();
  });

  test("passes the clean tree: reply addresses never use owner-token fallbacks", () => {
    for (const relPath of ["src/commands/control.ts", "src/commands/target.ts", "src/commands/spawn.ts", "src/commands/events.ts"]) {
      for (const line of readRepoLines(relPath)) expect(checkSpawnerReplyFallbackLine(line)).toBeUndefined();
    }
  });
});

describe("10.5 identity construction is issuer-only (checkIdentityConstructionLine)", () => {
  const relPath = "src/commands/somewhere.ts";

  test("flags object literals that synthesize an identity", () => {
    expect(checkIdentityConstructionLine(
      '  return serializeIdentity({ backend: id.backend, workspace: id.workspace, id: "operator" });',
      relPath,
    )).toContain("identity issuer");
  });

  test("flags concatenated and template identity keys", () => {
    expect(checkIdentityConstructionLine('  const key = backend + "~" + workspace + "~" + id;', relPath)).toContain("identity issuer");
    expect(checkIdentityConstructionLine("  const key = `${backend}~${workspace}~${id}`;", relPath)).toContain("identity issuer");
  });

  test("allows a fresh spawn mint and the issuer modules", () => {
    expect(checkIdentityConstructionLine(
      "  const key = serializeIdentity({ backend: backend.id, workspace, id: mintAgentId() });",
      relPath,
    )).toBeUndefined();
    expect(checkIdentityConstructionLine(
      "  const key = serializeIdentity({ backend, workspace, id: \"operator\" });",
      "src/backends/identity.ts",
    )).toBeUndefined();
    expect(checkIdentityConstructionLine(
      "  const key = `${backend}~${workspace}~${id}`;",
      "src/daemon/rpc.ts",
    )).toBeUndefined();
    expect(checkIdentityConstructionLine("  return serializeIdentity(identity);", relPath)).toBeUndefined();
  });

  // selfActor() is deleted (TASKS/02-scope.md B5), so its exemption is too. The rule
  // now applies with no holes; a future exemption must be argued for, not inherited.
  test("no file is exempt from the identity-construction rule", () => {
    expect(IDENTITY_CONSTRUCTION_ALLOWLIST.size).toBe(0);
  });

  test("passes the clean tree: every identity construction is allowed or registered", () => {
    const unregistered: string[] = [];
    for (const file of ["src/entities.ts", "src/commands/spawn.ts", "src/daemon/rpc.ts", "src/backends/identity.ts"]) {
      const allowed = IDENTITY_CONSTRUCTION_ALLOWLIST.get(file) ?? new Set<string>();
      for (const line of readRepoLines(file)) {
        if (allowed.has(line.trim())) continue;
        const reason = checkIdentityConstructionLine(line, file);
        if (reason) unregistered.push(`${file}: ${line.trim()}`);
      }
    }
    expect(unregistered).toEqual([]);
  });
});

describe("10.6 per-harness session parser banned from commands (checkCommandsParserLine)", () => {
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

describe("10.8 environment branches use capabilities, not plexer/harness ids (checkEnvironmentCapabilityLine)", () => {
  // E13 deleted the capability bag and every optional port method. The rule's
  // allow-list still named them, so `if (backend.capabilities…)` and
  // `if (adapter.createWorkspace)` — the exact shapes E13 forbids — were exempt
  // from the check that exists to forbid them. Rule 8: one current shape, and a
  // name that no longer exists on either port is not a role.
  test("a deleted capability bag or optional method is not exempt", () => {
    // `backend.capabilities.panes` is not asserted here: it is a property CHAIN,
    // which this rule deliberately leaves alone, and tsc already rejects it now
    // that `capabilities` is gone from the port. The three below are true
    // presence checks on names E13 deleted, and they must trip.
    expect(checkEnvironmentCapabilityLine("  if (adapter.createWorkspace) return adapter.createWorkspace(name);", "src/commands/space.ts")).toContain("method-presence");
    expect(checkEnvironmentCapabilityLine("  if (backend.handleFor) return backend.handleFor(key);", "src/control/dispatch.ts")).toContain("method-presence");
    expect(checkEnvironmentCapabilityLine("  if (backend.pruneLogs) return backend.pruneLogs(cutoff);", "src/daemon/retention.ts")).toContain("method-presence");
  });

  // A hand-kept list beside the ports is a second list to forget, in both
  // directions: a role added to a port is not exempt and trips the rule, and a
  // role DELETED from a port keeps its exemption forever. The list is derived
  // from the port declarations, so both directions fix themselves.
  test("the exempted names are the roles the ports actually declare", () => {
    for (const deleted of ["capabilities", "createWorkspace", "currentIdentity", "handleFor", "pruneLogs", "workspaces", "focusWorkspace", "version"]) {
      expect(ENVIRONMENT_ROLE_NAMES).not.toContain(deleted);
    }
    for (const composed of ["paneInventory", "paneInput", "spaceHome", "identity", "handleLookup", "logPruning", "inboxSteering", "question", "modelControl", "thinking"]) {
      expect(ENVIRONMENT_ROLE_NAMES).toContain(composed);
    }
  });

  // Plain nullable DATA on the port is not a capability. Exempting it would let
  // `if (backend.paneCount)` pass as a capability read.
  test("nullable data on the port is not exempted as a role", () => {
    expect(ENVIRONMENT_ROLE_NAMES).not.toContain("paneCount");
    expect(ENVIRONMENT_ROLE_NAMES).not.toContain("sessionPath");
    expect(checkEnvironmentCapabilityLine("  if (backend.paneCount) return countPanes();", "src/commands/panes.ts")).toContain("method-presence");
  });

  test("flags plexer and harness identity branches", () => {
    expect(checkEnvironmentCapabilityLine('  if (plexer === "herdr") return focus();', "src/commands/panes.ts")).toContain("environment identity");
    expect(checkEnvironmentCapabilityLine('  if (adapter.id === "pi") return run();', "src/commands/spawn.ts")).toContain("environment identity");
    expect(checkEnvironmentCapabilityLine('  if (key.startsWith("headless~")) return runHeadless();', "src/commands/spawn.ts")).toContain("environment identity");
    expect(checkEnvironmentCapabilityLine('  switch (harness) { case "pi": return run(); }', "src/commands/spawn.ts")).toContain("environment identity");
  });

  test("flags method-presence capability checks", () => {
    expect(checkEnvironmentCapabilityLine('  if (typeof backend.zoom === "function") return backend.zoom(target);', "src/commands/panes.ts")).toContain("method-presence");
    expect(checkEnvironmentCapabilityLine("  if (backend.sendKeys) return backend.sendKeys(target, text);", "src/commands/control.ts")).toContain("method-presence");
    expect(checkEnvironmentCapabilityLine('  if ("zoom" in provider) return provider.zoom(target);', "src/commands/panes.ts")).toContain("method-presence");
    expect(checkEnvironmentCapabilityLine("  if (provider.zoom?.()) return focus();", "src/commands/panes.ts")).toContain("method-presence");
  });

  test("allows a branch inside a concrete backend", () => {
    expect(checkEnvironmentCapabilityLine('  if (plexer === "herdr") return focus();', "src/backends/herdr/index.ts")).toBeUndefined();
  });

  // TASKS/02-scope.md I2 — the rule is not "a checker exists", it is that NO
  // behaviour in the tree branches on a plexer or harness id and NONE checks
  // whether a method exists. Every other rule in this file has a clean-tree half;
  // this one had only synthetic fixtures, which is how a rule passes for years
  // while the tree quietly violates it.
  test("passes the clean tree: no file in ANY scanned scope branches on an environment id", () => {
    // Exactly the scopes check-bridge runs this rule over. `src/backends/<plexer>/`
    // is self-exempt inside the checker - a concrete plexer owns its own wire
    // vocabulary - so including it here is deliberate and proves the exemption
    // is the checker's, not this test's.
    const scopes = ["src", "extensions", "packages/web/src"];
    const violations: string[] = [];
    for (const scope of scopes) {
      for (const file of sourceFiles(scope)) {
        const relPath = file.replace(/\\/g, "/");
        const lines = readRepoLines(file);
        for (let index = 0; index < lines.length; index++) {
          const reason = checkEnvironmentCapabilityLine(lines[index]!, relPath);
          if (reason) violations.push(`${relPath}:${index + 1}: ${lines[index]!.trim()}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("the core-scope allowlist is EMPTY, so no line holds a standing exemption", () => {
    // A per-line exemption never fails, so nothing ever tells you it stopped
    // being needed - the `src/seat/` hole this rule's comment names. The
    // allowlist exists as a mechanism and is deliberately unused.
    expect([...CORE_SCOPE_ALLOWLIST.keys()]).toEqual([]);
  });

  test("allows capability-driven code", () => {
    expect(checkEnvironmentCapabilityLine("  if (capabilities.canSendKeys) return sendKeys(target, text);", "src/commands/control.ts")).toBeUndefined();
  });
});

describe("10.7 leases and provenance stay in separate columns (checkLeaseProvenanceLine)", () => {
  test("flags INSERT and UPDATE SQL that welds a lease holder into spawned_by", () => {
    const bad = [
      'db.run(sql`INSERT INTO agents (id, spawned_by, root_agent_id) SELECT agent_id, orch_id, agent_id FROM agent_leases`);',
      'db.run(sql`UPDATE agents SET spawned_by = orchId WHERE id = ${id}`);',
      'db.run(sql`INSERT INTO agent_leases (agent_id, spawner, since) VALUES (${agentId}, ${spawner}, ${since})`);',
    ];
    for (const line of bad) expect(checkLeaseProvenanceLine(line, "src/store/lease-rows.ts")).toContain("lease and provenance");
  });

  test("flags lease row types carrying a provenance field", () => {
    const line = "interface LeaseRow { agent_id: string; spawner: string; since: number; }";
    expect(checkLeaseProvenanceLine(line, "src/store/lease-rows.ts")).toContain("lease row");
  });

  test("allows separate lease and provenance rows", () => {
    const clean = [
      'db.run(sql`INSERT INTO agent_leases (agent_id, orch_id, since) VALUES (${agentId}, ${orchId}, ${since})`);',
      "interface LeaseRow { agent_id: string; orch_id: string; since: number; }",
      'db.run(sql`INSERT INTO agents (id, spawned_by, root_agent_id) VALUES (${id}, ${spawnedBy}, ${root})`);',
    ];
    for (const line of clean) expect(checkLeaseProvenanceLine(line, "src/store/lease-rows.ts")).toBeUndefined();
  });

  test("passes the clean tree: no source line crosses lease and provenance columns", () => {
    const offenders: string[] = [];
    for (const relPath of sourceFiles("src")) {
      readRepoLines(relPath).forEach((line, index) => {
        if (checkLeaseProvenanceLine(line, relPath)) offenders.push(`${relPath}:${index + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

// The closed plexer-id set has to be spelled once so nothing else has to. That
// one line is the whole exemption: a file that writes an id any other way is
// still hard-coding a plexer, which is what this rule exists to stop.
describe("launch env reads stay in identity/launch.ts (checkLaunchEnvLine)", () => {
  test("flags a launch env read outside launch.ts with the file and constant named", () => {
    const reason = checkLaunchEnvLine("const key = process.env.ORCH_AGENT_KEY;", "src/commands/spawn.ts");
    expect(reason).toContain("src/identity/launch.ts");
    expect(reason).toContain("LAUNCH_ENV");
  });

  test("allows the launch env read inside identity/launch.ts", () => {
    expect(checkLaunchEnvLine("const key = process.env.ORCH_AGENT_KEY;", "src/identity/launch.ts")).toBeUndefined();
  });

  test("flags a bare launch env name literal outside launch.ts", () => {
    const reason = checkLaunchEnvLine('const name = "ORCH_AGENT_KEY";', "src/commands/spawn.ts");
    expect(reason).toContain("src/identity/launch.ts");
    expect(reason).toContain("LAUNCH_ENV");
  });

  test("flags a comment mentioning the launch env name outside launch.ts", () => {
    expect(checkLaunchEnvLine("// ORCH_AGENT_KEY is absent for humans", "src/commands/spawn.ts")).toContain("LAUNCH_ENV");
  });
});

describe("the closed plexer-id set is spelled in exactly one line", () => {
  const DEFINITION = 'export const BACKEND_IDS = ["herdr", "tmux", "headless"] as const;';

  test("the definition line is allowed where it lives, and nowhere else", () => {
    expect(checkPlexerLiteralLine(DEFINITION, "src/types/backend.ts", "outside backends")).toBeUndefined();
    expect(checkPlexerLiteralLine(DEFINITION, "src/commands/status.ts", "outside backends"))
      .toBe("quoted herdr/tmux literals are forbidden outside backends");
  });

  test("any other quoted plexer id in that same file still fails", () => {
    expect(checkPlexerLiteralLine('if (backend === "herdr") return true;', "src/types/backend.ts", "outside backends"))
      .toBe("quoted herdr/tmux literals are forbidden outside backends");
    expect(checkPlexerLiteralLine('const fallback = "tmux";', "src/types/backend.ts", "outside backends"))
      .toBe("quoted herdr/tmux literals are forbidden outside backends");
  });

  test("the line src/types/backend.ts actually carries is the allowed one", () => {
    const source = readFileSync("src/types/backend.ts", "utf8").split("\n");
    const spelled = source.flatMap((line, index) =>
      checkPlexerLiteralLine(line, "src/types/backend.ts", "outside backends") ? [`src/types/backend.ts:${index + 1}`] : []);
    expect(spelled).toEqual([]);
    expect(source.map((line) => line.trim())).toContain(DEFINITION);
  });

  test("extensions get the same rule with their own scope named", () => {
    expect(checkPlexerLiteralLine('const id = "herdr";', "extensions/pi/bridge.ts", "in extensions"))
      .toBe("quoted herdr/tmux literals are forbidden in extensions");
  });
});
