#!/usr/bin/env bun
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_ENV } from "../src/identity/launch.ts";

const packageRoot = join(import.meta.dirname, "..");
const repoRoot = join(packageRoot, "..", "..");

function fail(file: string, line: number, reason: string): never {
  console.log(`check:bridge FAIL ${file}:${line} ${reason}`);
  process.exit(1);
}

/** Repo-relative, forward-slashed path — the key shape every allowlist here uses.
 * `join` yields backslashes on Windows, where this check also runs. */
function relPathOf(file: string): string {
  return file.replace(/\\/g, "/");
}

/**
 * I2 — the plexer and harness ids every identity rule below branches on,
 * DERIVED from the tree rather than typed out beside it.
 *
 * A plexer owns a directory under `src/backends/` and a harness owns a
 * directory under `extensions/` (Rule 10), so the tree already answers "what
 * ids exist". The hand-kept copies that stood here had drifted in the way a
 * second list always does: `PROVIDER_IDS` never listed `omp`, so
 * `harness === "omp"` was exempt from the exact rule that exists to forbid it,
 * and a deleted backend would have kept its entry forever.
 *
 * Throws when a source yields nothing: an empty alternation matches nothing,
 * which would turn every rule built on it into a silent pass — the same failure
 * mode `scanDirectory`'s recursion guard (I5) exists to prevent.
 */
function directoryIds(directory: string, label: string): readonly string[] {
  let entries: string[];
  try {
    entries = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    entries = [];
  }
  if (entries.length === 0) {
    throw new Error(`check-bridge: found no ${label} directories under ${directory}/ - the tree layout changed under this rule`);
  }
  return entries.sort((left, right) => left.localeCompare(right));
}

/** Every plexer: one directory under `src/backends/`. */
export const PLEXER_IDS: readonly string[] = directoryIds(join(packageRoot, "src/backends"), "plexer");
/** Every harness: one directory under `extensions/` (Rule 10). */
export const HARNESS_IDS: readonly string[] = directoryIds(join(packageRoot, "extensions"), "harness");
/** The union both identity rules branch on. */
export const ENVIRONMENT_IDS: readonly string[] = [...new Set([...HARNESS_IDS, ...PLEXER_IDS])].sort((left, right) => left.localeCompare(right));

function alternation(ids: readonly string[]): string {
  return ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

type LineCheck = (line: string, relPath: string) => string | undefined;

function scanDirectory(directory: string, excluded: Set<string>, check: LineCheck, recursive = false): number {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory() && recursive) {
      count += scanDirectory(join(directory, entry.name), excluded, check, true);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".ts") || excluded.has(entry.name)) continue;
    const file = join(directory, entry.name);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const reason = check(lines[index]!, relPathOf(file));
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

function scanSrcOutsideBackends(check: LineCheck): number {
  const entries = readdirSync("src", { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name === "backends") continue;
    if (entry.isDirectory()) {
      count += scanDirectory(join("src", entry.name), new Set(), check, true);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const file = join("src", entry.name);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const reason = check(lines[index]!, relPathOf(file));
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

/**
 * Recursively scan a source tree for both `.ts` and `.tsx`, skipping any
 * `node_modules`. Used by the packages boundary scan (D2.1): web components are
 * `.tsx`, and a concrete backend/adapter import can hide in one just as easily
 * as in a `.ts` server module.
 */
function scanSourceTree(directory: string, check: LineCheck, relativeDirectory = directory): number {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      count += scanSourceTree(join(directory, entry.name), check, join(relativeDirectory, entry.name));
      continue;
    }
    if (!entry.isFile() || (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx"))) continue;
    const file = join(directory, entry.name);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const reason = check(lines[index]!, relPathOf(join(relativeDirectory, entry.name)));
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

/** Scan every `packages/<pkg>/src/**` tree. Missing `packages/` or a package
 * without `src/` is skipped, not an error (some checkouts ship core only). */
function scanPackagesSrc(check: LineCheck): number {
  let packageDirs: string[];
  try {
    packageDirs = readdirSync(join(repoRoot, "packages"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && join(repoRoot, "packages", entry.name) !== packageRoot)
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return 0;
  }
  let count = 0;
  for (const pkg of packageDirs) {
    const srcDir = join(repoRoot, "packages", pkg, "src");
    try {
      readdirSync(srcDir);
    } catch {
      continue;
    }
    count += scanSourceTree(srcDir, check, join("packages", pkg, "src"));
  }
  return count;
}

/**
 * The presence protocol filenames. orch DEFINES these — they are core
 * vocabulary, not a third party's wire format, which is why they are not in
 * ADAPTER_WIRE_LITERALS (design D6). The compensating rule: they get exactly ONE
 * definition site. src/presence/schema.ts exports them as constants; hard-coding
 * the raw quoted string anywhere else under src/** or extensions/** is what
 * this bans.
 */
const PRESENCE_FILENAMES: readonly string[] = [
  "status.json",
  "result.json",
  "inbox.jsonl",
  "answer.json",
  "ack.jsonl",
];

/** The one directory allowed to name a presence file literally. */
const PRESENCE_SCOPE = "src/presence";

/** The one module allowed to invoke an adapter's control strategies (D2.2). */
const DISPATCHER_MODULE = "src/control/dispatch.ts";

/** Provider/backend identity strings. Branching on these by literal in core is
 * the string-form of the `.id ===` breach the identity-branch rule bans (D2.3).
 * Derived (see ENVIRONMENT_IDS) — never a second list to forget. */
const PROVIDER_ID_ALTERNATION = alternation(ENVIRONMENT_IDS);
const IDENTITY_EQUALITY_RIGHT = new RegExp(`(?:===|!==)\\s*["'](?:${PROVIDER_ID_ALTERNATION})["']`);
const IDENTITY_EQUALITY_LEFT = new RegExp(`["'](?:${PROVIDER_ID_ALTERNATION})["']\\s*(?:===|!==)`);
const IDENTITY_FALLBACK = new RegExp(`(?:\\?\\?|\\|\\|)\\s*["'](?:${PROVIDER_ID_ALTERNATION})["']`);

/**
 * Adapter wire-format literals banned from core (src/** outside src/adapters
 * and src/backends). This is the single exhaustive place the set lives —
 * adding a new adapter's literal here is the only change a new adapter needs.
 */
const ADAPTER_WIRE_LITERALS: readonly { readonly owner: string; readonly literal: string }[] = [
  // NOTE: "inbox.jsonl"/"answer.json" are deliberately NOT here. The test is who
  // DEFINES the string: codex's `turn.completed` and claude's `SessionStart` are
  // foreign vocabulary orch conforms to, but the presence filenames are files
  // orch invented for its own protocol (pi is merely the only harness that
  // implements the mid-run half today). They are core vocabulary, same as
  // the other presence files — guarded instead by PRESENCE_FILENAMES (design D6).
  { owner: "codex", literal: "agent-turn-complete" },
  { owner: "codex", literal: "agent_turn_complete" },
  { owner: "codex", literal: "turn.completed" },
  { owner: "codex", literal: "turn-complete" },
  { owner: "codex", literal: "turn_complete" },
  { owner: "claude", literal: "SessionStart" },
  { owner: "claude", literal: "Stop" },
  { owner: "claude", literal: "Notification" },
  { owner: "claude", literal: "claude-hooks" },
];

function quotedLiteralPattern(literal: string): RegExp {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`["']${escaped}["']`);
}

/**
 * Documented core-scope exemptions, keyed by repo-relative path → the set of
 * exact (trimmed) source lines that may violate an otherwise-strict core rule.
 *
 * EMPTY, and that is the goal state. The last entry was the setup smoke test
 * (`spawnHeadlessSmokeAgent`), which re-filtered the freshly-recorded rows by
 * the headless plexer id after already spawning with `--backend headless`. The
 * comparison was redundant — the row absent from the pre-spawn set IS the agent
 * that spawn just created — so it was deleted rather than re-blessed. Rule 11:
 * branch on declared capabilities, never on an environment id. An exemption is
 * a hole in the rule; deleting the branch is always the better fix.
 *
 * Keyed by exact (trimmed) line content rather than line number: other tasks in
 * this change edit these same files concurrently, and a line-number key would
 * silently stop matching (or silently match the wrong line) on every unrelated
 * insertion/deletion above it. Add an entry ONLY with a comment justifying why
 * the site legitimately declares an id — and only after establishing the branch
 * genuinely cannot be removed.
 */
export const CORE_SCOPE_ALLOWLIST: ReadonlyMap<string, ReadonlySet<string>> = new Map();

/** Eh13: the explicit adapter-id -> herdr-kind map is the ONE sanctioned place a
 *  backend spells a harness name — it is herdr's wire vocabulary, not a branch. */
export const BACKEND_KIND_MAP_ALLOWLIST: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [
    "src/backends/herdr/index.ts",
    new Set(['pi: "pi",', 'claude: "claude",', 'codex: "codex",']),
  ],
]);

/** The closed plexer-id set has to be spelled SOMEWHERE, and `src/types/backend.ts`
 *  is that place: `BACKEND_IDS` is what every other module imports instead of
 *  writing "herdr" itself, and it lives in types so importing it pulls no provider
 *  code. The exemption is the exact definition line and nothing else — any other
 *  quoted plexer id in that file still fails. */
export const PLEXER_ID_SET_ALLOWLIST: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [
    "src/types/backend.ts",
    new Set(['export const BACKEND_IDS = ["herdr", "tmux", "headless"] as const;']),
  ],
]);

/**
 * A plexer id written as a literal where it is not that plexer's own code to
 * write. `where` names the scope in the message so one rule serves both scans.
 *
 * The only exemption is {@link PLEXER_ID_SET_ALLOWLIST}: the line that DEFINES
 * the closed set, which every other module imports instead of spelling an id.
 */
export function checkPlexerLiteralLine(line: string, relPath: string, where: string): string | undefined {
  if (!/["'](herdr|tmux)["']/.test(line)) return undefined;
  if (PLEXER_ID_SET_ALLOWLIST.get(relPath)?.has(line.trim())) return undefined;
  return `quoted herdr/tmux literals are forbidden ${where}`;
}

const launchEnvName = LAUNCH_ENV.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LAUNCH_ENV_TOKEN = new RegExp(`\\b${launchEnvName}\\b`);

export function checkLaunchEnvLine(line: string, relPath: string): string | undefined {
  const normalizedPath = relPath.replace(/\\/g, "/");
  if (normalizedPath === "src/identity/launch.ts") return undefined;
  if (LAUNCH_ENV_TOKEN.test(line)) {
    return "launch env may only be read in src/identity/launch.ts via LAUNCH_ENV";
  }
  return undefined;
}

/** Exact backend-owned environment names in addition to the directory-derived prefix. */
const BACKEND_ENV_PREFIX_EXTRAS: ReadonlyMap<string, readonly string[]> = new Map([
  ["tmux", ["TMUX"]],
]);

function backendEnvNames(): ReadonlyMap<string, string> {
  const owners = new Map<string, string>();
  for (const backend of PLEXER_IDS) {
    const prefix = `${backend.toUpperCase()}_`;
    owners.set(prefix, backend);
    for (const extra of BACKEND_ENV_PREFIX_EXTRAS.get(backend) ?? []) owners.set(extra, backend);
    const lines = scanBackendEnvReferences(join(packageRoot, "src/backends", backend));
    for (const name of lines) if (!name.startsWith("ORCH_")) owners.set(name, backend);
  }
  return owners;
}

function scanBackendEnvReferences(directory: string): Set<string> {
  const names = new Set<string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(current, entry.name));
      else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const text = readFileSync(join(current, entry.name), "utf8");
        for (const match of text.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g)) {
          const name = match[1] ?? match[2];
          if (name) names.add(name);
        }
      }
    }
  };
  walk(directory);
  return names;
}

const BACKEND_ENV_OWNERS = backendEnvNames();

function checkBackendEnvLine(line: string, relPath: string): string | undefined {
  const backendMatch = /^src\/backends\/([^/]+)\//.exec(relPath);
  const backendOwner = backendMatch?.[1];
  for (const match of line.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g)) {
    const name = match[1] ?? match[2];
    if (!name || name.startsWith("ORCH_")) continue;
    const owner = [...BACKEND_ENV_OWNERS.entries()]
      .filter(([pattern]) => name === pattern || name.startsWith(pattern))
      .sort(([left], [right]) => right.length - left.length)[0]?.[1];
    if (!owner) continue;
    if (backendOwner === owner || relPath.startsWith("extensions/")) continue;
    return `backend-owned env ${name} is forbidden here; derive via the backend port capability, not env`;
  }
  return undefined;
}

function checkPresenceFilenameLine(line: string, relPath: string): string | undefined {
  if (relPath.startsWith(`${PRESENCE_SCOPE}/`)) return undefined;
  for (const filename of PRESENCE_FILENAMES) {
    if (quotedLiteralPattern(filename).test(line)) {
      return `presence filename ${JSON.stringify(filename)} is forbidden outside ${PRESENCE_SCOPE}/; import the constant from ${PRESENCE_SCOPE}/schema.ts`;
    }
  }
  return undefined;
}

/**
 * D2.1 — a package (`packages/<pkg>/src/**`) may reach into core only through
 * the ports: registry, policy, store, config, daemon client. A concrete backend
 * implementation (`src/backends/<id>/…`) or a concrete agent adapter
 * (`src/adapters/{pi,omp,claude,codex}`) import re-couples the package to a leaf,
 * which is exactly the breach `resolveBackend`/`resolveAdapter` exist to prevent.
 * `backends/registry.ts`, `backends/backend.ts`, `adapters/registry.ts`, and the
 * parser leaves (`adapters/adapter.ts`, `adapters/transcript.ts`,
 * `adapters/codex-events.ts`) sit directly under their dir (no `<id>/` subpath,
 * not a bare harness id) and stay allowed.
 */
const CONCRETE_ADAPTER_IMPORT = new RegExp(`adapters\\/(?:${alternation(HARNESS_IDS)})(?:\\.ts)?["']`);

export function checkPackageImportLine(line: string): string | undefined {
  if (/backends\/[\w-]+\//.test(line)) {
    return "packages must not import a concrete backend (src/backends/<id>/…); resolve via src/backends/registry.ts or the backend port";
  }
  if (CONCRETE_ADAPTER_IMPORT.test(line)) {
    return "packages must not import a concrete agent adapter (src/adapters/<id>); resolve via src/adapters/registry.ts";
  }
  return undefined;
}

/**
 * D2.2 — adapter control strategies (`adapter.steer`/`adapter.answer`/
 * `adapter.setModel`) may be invoked only from the one control dispatcher
 * (`src/control/dispatch.ts`) and, of course, defined inside the adapters
 * themselves (`src/adapters/**`). Calls on the shared harness port are not
 * adapter strategies and must remain legal in `src/agent/**`.
 */
export function checkDispatcherCallLine(line: string, relPath: string): string | undefined {
  if (relPath === DISPATCHER_MODULE || relPath.startsWith("src/adapters/")) return undefined;
  if (/\b(?:adapter|resolvedAdapter)\.(?:steer|answer|setModel)\s*\(/.test(line)) {
    return "adapter control strategy (.steer/.answer/.setModel) may be invoked only through src/control/dispatch.ts";
  }
  return undefined;
}

/** A reply address is an issued spawner key, never the governance owner token. */
const SPAWNER_REPLY_OWNER_FALLBACK = /\b(?:spawner(?:Identity\(\))?\s*\.\s*key|(?:spawner|reply)(?:Key|Address)?)\s*(?:\?\?|\|\|)\s*(?:callerOwnerToken\(\)|(?:process\.env\.)?ORCH_OWNER\b)/;

export function checkSpawnerReplyFallbackLine(line: string): string | undefined {
  if (SPAWNER_REPLY_OWNER_FALLBACK.test(line)) {
    return "spawner reply address must not fall back to an owner token; use an issued spawner key or refuse the write";
  }
  return undefined;
}

/**
 * I1 — provenance and leases are separate facts. SQL must not put a lease
 * holder (`orch_id`) in an agent's provenance (`spawned_by`), and a lease row
 * must not grow a provenance/spawner field. Keep this deliberately lexical: the
 * checker is a line rule, so an explicit table/column or row-type crossing is
 * the actionable shape it can prove without pretending to parse TypeScript.
 */
const PROVENANCE_FIELD = /\b(?:spawned_by|spawnedBy|spawner|spawnerId)\b/;
const LEASE_FIELD = /\b(?:agent_leases|orch_id|orchId|leaseHolder|lease_holder|holderId)\b/;
const LEASE_ROW_TYPE = /\b(?:interface|type|class)\s+\w*Lease\w*\b/;

export function checkLeaseProvenanceLine(line: string, relPath: string): string | undefined {
  const normalizedPath = relPath.replace(/\\/g, "/");
  const hasProvenance = PROVENANCE_FIELD.test(line);
  if (!hasProvenance) return undefined;

  // A lease table statement carrying a provenance column welds the two facts.
  if (/\bagent_leases\b/.test(line) && /(?:INSERT|UPDATE|SELECT|SET|\bCREATE TABLE\b)/i.test(line)) {
    return "lease and provenance columns must remain separate; agent_leases must not carry spawned_by or spawner";
  }

  // Any INSERT/UPDATE that mentions both a provenance field and a lease
  // holder is a direct crossing, including writes to the older spawned table.
  if (/\b(?:INSERT\s+INTO|UPDATE)\b/i.test(line) && LEASE_FIELD.test(line)) {
    return "lease and provenance columns must remain separate; do not write a lease holder into spawned_by";
  }

  // Row-module declarations are the other crossing shape: a Lease/LeaseRow
  // may only expose lease facts (agent, holder, and its validity interval).
  if (LEASE_ROW_TYPE.test(line) || (normalizedPath.endsWith("/lease-rows.ts") && /\b(?:spawned_by|spawnedBy|spawner|spawnerId)\s*[?:]/.test(line))) {
    return "lease row types must not carry provenance/spawner fields";
  }

  return undefined;
}

const IDENTITY_ISSUER_MODULES = new Set(["src/backends/identity.ts", "src/daemon/rpc.ts"]);
const IDENTITY_TEMPLATE_CONSTRUCTION = /`[^`\r\n]*~[^`\r\n]*~[^`\r\n]*`/;
const IDENTITY_CONCAT_CONSTRUCTION = /(?:\+\s*["']~["']\s*\+).*(?:\+\s*["']~["']\s*\+)/;

function constructsIdentityObject(line: string): boolean {
  const match = /\bserializeIdentity\s*\(\s*\{([^}]*)\}\s*\)/.exec(line);
  if (!match) return false;
  const idExpression = /\bid\s*:\s*([^,}]+)/.exec(match[1]!)?.[1] ?? "";
  return !/\bmintAgentId\s*\(\s*\)/.test(idExpression);
}

function identityStringUsesFreshMint(line: string): boolean {
  const template = /`([^`\r\n]*)`/.exec(line)?.[1];
  if (template !== undefined) return template.split("~").at(-1)?.includes("mintAgentId(") ?? false;
  const concatenated = line.split(/["']~["']/);
  return concatenated.length >= 3 && concatenated[2]!.includes("mintAgentId(");
}

function constructsIdentityString(line: string): boolean {
  const template = /`([^`\r\n]*)`/.exec(line)?.[1];
  const isTemplateConstruction = template !== undefined
    && IDENTITY_TEMPLATE_CONSTRUCTION.test(line)
    && template.includes("${");
  if (!isTemplateConstruction && !IDENTITY_CONCAT_CONSTRUCTION.test(line)) return false;
  return !identityStringUsesFreshMint(line);
}

/**
 * Identity keys are issued, not assembled by callers. A fresh mintAgentId()
 * is the one spawn-time construction permitted outside the issuer; all other
 * object-literal and string assembly shapes are forbidden.
 */
export function checkIdentityConstructionLine(line: string, relPath: string): string | undefined {
  if (IDENTITY_ISSUER_MODULES.has(relPath)) return undefined;
  if (constructsIdentityObject(line) || constructsIdentityString(line)) {
    return "agent identities must be constructed by the identity issuer; use an issued identity rather than assembling backend/workspace/id parts";
  }
  return undefined;
}

/**
 * Registered identity-construction exemptions. Each entry is a known violation
 * kept temporarily because its caller still depends on the old selfActor shape.
 * It must remain visible here until that caller is removed; never add a broad
 * path exemption for this invariant.
 */
/**
 * Lines exempt from the identity-construction rule.
 *
 * EMPTY, and it must stay that way unless a new exemption is argued for. The one
 * entry this held exempted `selfActor()`, which minted `<backend>~<workspace>~operator`
 * — the exact welding of environment into identity `TASKS/01-agent-model.md` forbids.
 * `selfActor()` is deleted (`TASKS/02-scope.md` B5), so the exemption outlived the code
 * it excused and was holding the rule open for nothing.
 */
export const IDENTITY_CONSTRUCTION_ALLOWLIST: ReadonlyMap<string, ReadonlySet<string>> = new Map();

/**
 * D2.4 — `src/commands/**` reads sessions through the resolved adapter's
 * `readSessionView` port surface, never by importing a per-harness parser.
 * `parseSession` is pi's parser (src/session.ts); importing or calling it in a
 * command misparses claude/codex sessions. Only the pi adapter may name it.
 */
export function checkCommandsParserLine(line: string): string | undefined {
  if (/\bparseSession\b/.test(line)) {
    return "per-harness session parser parseSession is forbidden in src/commands/; read via the resolved adapter's readSessionView port";
  }
  return undefined;
}

/** Build-only bridge bundle code must never be imported by runtime source. */
export function checkBridgeBundleImportLine(line: string, relPath: string): string | undefined {
  const normalizedPath = relPath.replace(/\\/g, "/");
  if (!normalizedPath.startsWith("src/") || normalizedPath === "src/bridge-bundles/build.ts") return undefined;
  if (/(?:from\s+|import\s*\()\s*["'][^"']*bridge-bundles\/build\.ts["']/.test(line)) {
    return "bridge-bundles/build.ts is build tooling; runtime src/** must use shipped bundle metadata without importing it";
  }
  return undefined;
}

/**
 * I2 — environment capabilities are composed, never inferred from provider
 * identity or from the shape of a port object. Concrete backend modules own
 * their wire vocabulary and may branch on their own id; every other src module
 * must use the declared environment capabilities instead.
 */
const ENVIRONMENT_ID_ALTERNATION = alternation(ENVIRONMENT_IDS);
const ENVIRONMENT_REFERENCE = "(?:backend|backendId|plexer|plexerId|harness|harnessId|adapter|adapterId|resolvedBackend|resolvedAdapter|provider|key|identity(?:\\.key)?)";
const ENVIRONMENT_ID_EQUALITY = new RegExp(
  `(?:${ENVIRONMENT_REFERENCE})(?:\\.id)?\\s*(?:===|!==|==|!=)\\s*["'](?:${ENVIRONMENT_ID_ALTERNATION})["']|["'](?:${ENVIRONMENT_ID_ALTERNATION})["']\\s*(?:===|!==|==|!=)\\s*(?:${ENVIRONMENT_REFERENCE})(?:\\.id)?`,
);
const ENVIRONMENT_SWITCH = new RegExp(`\\bswitch\\s*\\(\\s*(?:${ENVIRONMENT_REFERENCE})(?:\\.id)?\\s*\\)`);
const ENVIRONMENT_KEY_PREFIX = new RegExp(`\\b(?:key|identity\\.key)\\s*\\.\\s*startsWith\\s*\\(\\s*["'](?:${ENVIRONMENT_ID_ALTERNATION})~`);
const METHOD_OWNER = "(?:provider|backend|adapter|resolvedBackend|resolvedAdapter)";
/**
 * Role members declared on the two ports, read FROM the ports.
 *
 * These are the names a core module may legitimately null-check: E13 made
 * composition the capability, so `if (adapter.inboxSteering)` is the prescribed
 * shape and must not trip the method-presence rule. Everything else still does.
 *
 * Derived, never hand-kept. The copy that used to stand here still named
 * `capabilities`, `createWorkspace`, `handleFor`, `pruneLogs`, `workspaces`,
 * `focusWorkspace` and `version` long after E13 deleted them — so the rule
 * exempted the exact shapes it exists to forbid. A list beside the thing it
 * describes is a second list to forget, in both directions.
 */
function portRoleMembers(): readonly string[] {
  const names = new Set<string>();
  for (const file of [join(packageRoot, "src/types/backend.ts"), join(packageRoot, "src/types/adapter.ts")]) {
    const source = readFileSync(file, "utf8");
    // A composed role is a member whose TYPE is a Role or a Strategy — `readonly
    // paneHost: PaneHostRole<Handle> | null`, `readonly thinking: ThinkingStrategy
    // | null` (TASKS/07 names both). Matching on the type, not on the interface
    // name, survives the port being renamed or split, and deliberately does NOT
    // exempt plain nullable data (`readonly paneCount: number | null`), which is
    // not a capability and must never be null-checked as one.
    for (const member of source.matchAll(/^\s*readonly\s+([A-Za-z_$][\w$]*)\s*:\s*[^;]*[A-Za-z](?:Role|Strategy)\b[^;]*;/gm)) {
      names.add(member[1]!);
    }
  }
  // The adapter port's declared-optional fields are an absence the core reads
  // directly too. Scoped to that interface: an optional field on a REQUEST type
  // is not a capability, and exempting those would gut the rule.
  const adapter = readFileSync(join(packageRoot, "src/types/adapter.ts"), "utf8");
  const port = /^export interface AgentAdapter\b[^{]*\{([\s\S]*?)^\}/m.exec(adapter)?.[1] ?? "";
  for (const member of port.matchAll(/^\s*readonly\s+([A-Za-z_$][\w$]*)\s*\?\s*:/gm)) names.add(member[1]!);
  if (names.size === 0) throw new Error("check-bridge: found no role members on the ports - the port shape changed under this rule");
  names.add("id");
  return [...names];
}

export const ENVIRONMENT_ROLE_NAMES: readonly string[] = portRoleMembers();
const ENVIRONMENT_ROLE_ALTERNATION = ENVIRONMENT_ROLE_NAMES.join("|");
/**
 * Scoped to METHOD_OWNER, exactly like the three patterns below it. E13 forbids
 * asking a PORT whether it has a method; `typeof value.fn === "function"` on a
 * genuinely `unknown` value from a foreign API is a type guard narrowing data,
 * which is the only way to read an `unknown` safely and never a capability
 * negotiation. Unscoped, this pattern flagged those guards — and the answer had
 * been a whole-directory exemption for `src/seat/`, which then exempted every
 * real breach in that directory too. Precision here is what lets the hole close.
 */
const METHOD_TYPEOF = new RegExp(`\\btypeof\\s+${METHOD_OWNER}(?:\\.[A-Za-z_$][\\w$]*)+\\s*(?:===|!==|==|!=)\\s*["']function["']`);
const METHOD_IN = new RegExp(`["'][^"']+["']\\s+in\\s+${METHOD_OWNER}\\b`);
const METHOD_PROPERTY_CONDITION = new RegExp(
  `\\b(?:if|while)\\s*\\([^)]*\\b${METHOD_OWNER}\\.(?!${ENVIRONMENT_ROLE_ALTERNATION}\\b)[A-Za-z_$][\\w$]*\\b(?!\\s*(?:\\?\\.)?\\s*\\()(?!\\s*\\.)`,
);
const OPTIONAL_METHOD_CONDITION = new RegExp(
  `\\b(?:if|while)\\s*\\([^)]*\\b${METHOD_OWNER}\\.(?!${ENVIRONMENT_ROLE_ALTERNATION}\\b)[A-Za-z_$][\\w$]*\\?\\.\\s*\\(`,
);

export function checkEnvironmentCapabilityLine(line: string, relPath: string): string | undefined {
  const normalizedPath = relPath.replace(/\\/g, "/");
  // Only a CONCRETE plexer directory owns its own wire vocabulary. `src/seat/`
  // used to be exempt here too — a whole-directory hole in the rule, kept after
  // the branches that needed it were gone. A path exemption is invisible: it
  // never fails, so nothing ever tells you it stopped being needed.
  if (/^src\/backends\/[^/]+\//.test(normalizedPath)) return undefined;

  if (ENVIRONMENT_ID_EQUALITY.test(line) || ENVIRONMENT_SWITCH.test(line) || ENVIRONMENT_KEY_PREFIX.test(line)) {
    return "environment identity branching is forbidden outside concrete backends; branch on declared capabilities instead";
  }
  if (METHOD_TYPEOF.test(line) || METHOD_IN.test(line) || METHOD_PROPERTY_CONDITION.test(line) || OPTIONAL_METHOD_CONDITION.test(line)) {
    return "method-presence capability checks are forbidden; read the composed environment capability instead";
  }
  return undefined;
}

const CORE_ADAPTER_IMPORT = new RegExp(`from\\s+["'][^"']*\\/(?:${alternation(HARNESS_IDS)})(?:\\.ts)?["']`);
const CORE_BACKEND_IMPORT = new RegExp(`from\\s+["'][^"']*backends\\/(?:${alternation(PLEXER_IDS)})\\/`);
/** Agent-id literals a backend must not spell (Eh13's kind map is the one exemption). */
const HARNESS_ID_LITERAL = new RegExp(`["']\\b(?:${alternation(HARNESS_IDS)})\\b["']`);

export function checkCoreScopeLine(line: string, relPath: string): string | undefined {
  const backendEnvViolation = checkBackendEnvLine(line, relPath);
  if (backendEnvViolation) return backendEnvViolation;
  const presenceViolation = checkPresenceFilenameLine(line, relPath);
  if (presenceViolation) return presenceViolation;
  if (CORE_ADAPTER_IMPORT.test(line)) {
    return "concrete adapter imports are forbidden in core; resolve via src/adapters/registry.ts";
  }
  if (CORE_BACKEND_IMPORT.test(line)) {
    return "concrete backend imports are forbidden in core; resolve via src/backends/registry.ts";
  }
  if (/\b(?:adapter|backend)\.id\s*(?:===|!==)/.test(line)) {
    return "adapter/backend identity branching is forbidden in core; branch on declared capabilities instead";
  }
  // D2.3 — string-form of the same identity branch: `x === "pi"`, `"headless" !== x`,
  // and `x ?? "pi"` / `x || "pi"` default-adapter fallbacks (the pi-default bug D5 removed).
  if (IDENTITY_EQUALITY_RIGHT.test(line) || IDENTITY_EQUALITY_LEFT.test(line) || IDENTITY_FALLBACK.test(line)) {
    return "string-form provider/backend identity branch is forbidden in core; branch on declared capabilities and resolve via the registry";
  }
  for (const { owner, literal } of ADAPTER_WIRE_LITERALS) {
    if (quotedLiteralPattern(literal).test(line)) {
      return `${owner} adapter wire literal ${JSON.stringify(literal)} is forbidden in core; keep it inside src/adapters/${owner}.ts`;
    }
  }
  return undefined;
}

/** Recursively scan src/** for port-boundary violations, excluding the adapter/backend port dirs. */
function scanCoreScope(): number {
  let count = 0;
  function walk(directory: string, relPath: string): void {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (directory === "src" && (entry.name === "adapters" || entry.name === "backends")) continue;
      const entryRelPath = `${relPath}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(directory, entry.name), entryRelPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const file = join(directory, entry.name);
      const allowed = CORE_SCOPE_ALLOWLIST.get(entryRelPath);
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        if (allowed?.has(lines[index]!.trim())) continue;
        const reason = checkCoreScopeLine(lines[index]!, entryRelPath);
        if (reason) fail(file, index + 1, reason);
      }
      count++;
    }
  }
  walk("src", "src");
  return count;
}

function runAllChecks(): void {
  /**
   * The presence filenames have exactly one definition site: src/presence/schema.ts.
   * Every other file under src/ and every harness artifact under extensions/
   * imports the constants, so a raw quoted occurrence anywhere else is a second
   * definition and fails this check.
   */
  const bridgeSourceFiles = scanSrcOutsideBackends((line, relPath) => {
    const launchEnvViolation = checkLaunchEnvLine(line, relPath);
    if (launchEnvViolation) return launchEnvViolation;
    const environmentCapabilityViolation = checkEnvironmentCapabilityLine(line, relPath);
    if (environmentCapabilityViolation) {
      const allowed = CORE_SCOPE_ALLOWLIST.get(relPath);
      if (!allowed?.has(line.trim())) return environmentCapabilityViolation;
    }
    const bridgeBundleViolation = checkBridgeBundleImportLine(line, relPath);
    if (bridgeBundleViolation) return bridgeBundleViolation;
    const backendEnvViolation = checkBackendEnvLine(line, relPath);
    if (backendEnvViolation) return backendEnvViolation;
    if (/backends\/[\w-]+\//.test(line)) return "backend subpath imports are forbidden outside backends (boundary modules live directly under backends/)";
    if (/\b(?:herdrBestEffort|herdrJSON|herdrExec|herdrPanes|herdrTabs|herdrNames|herdrReachable|HERDR_PANE_ID|TMUX_PANE)\b/.test(line)) {
      return "backend-specific herdr/tmux identifiers are forbidden outside backends";
    }
    if (line.includes("process.env.HERDR")) return "process.env.HERDR is forbidden outside backends";
    if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden outside backends";
    const plexerLiteralViolation = checkPlexerLiteralLine(line, relPath, "outside backends");
    if (plexerLiteralViolation) return plexerLiteralViolation;
    return undefined;
  });

  const extensionFiles = scanDirectory("extensions", new Set(), (line, relPath) => {
    const launchEnvViolation = checkLaunchEnvLine(line, relPath);
    if (launchEnvViolation) return launchEnvViolation;
    // A harness extension is per-HARNESS code (Rule 10), never per-plexer, so
    // the identity-branch rule applies here whole: nothing under extensions/ may
    // branch on a plexer id or ask a port whether it has a method. Deliberately
    // no `extensions/<harness>/` self-exemption to mirror the backends one — the
    // tree needs none today, and an exemption nothing exercises is the src/seat
    // hole all over again.
    const environmentCapabilityViolation = checkEnvironmentCapabilityLine(line, relPath);
    if (environmentCapabilityViolation) return environmentCapabilityViolation;
    const presenceViolation = checkPresenceFilenameLine(line, relPath);
    if (presenceViolation) return presenceViolation;
    if (/backends\/[\w-]+\//.test(line)) return "backend subpath imports are forbidden in extensions (boundary modules live directly under backends/)";
    // Harness extensions may read the environment for their own harness integration.
    const plexerLiteralViolation = checkPlexerLiteralLine(line, relPath, "in extensions");
    if (plexerLiteralViolation) return plexerLiteralViolation;
    return undefined;
    // Recursive: each harness owns extensions/<harness>/, so every file is one level down.
  }, true);

  const scriptFiles = scanDirectory("scripts", new Set(["check-bridge.ts"]), (line, relPath) => {
    const launchEnvViolation = checkLaunchEnvLine(line, relPath);
    if (launchEnvViolation) return launchEnvViolation;
    if (line.includes("HERDR_PANE_ID")) return "HERDR_PANE_ID is forbidden in scripts";
    if (line.includes("TMUX_PANE")) return "TMUX_PANE is forbidden in scripts";
    if (/process\.env\.HERDR(?!_ENV\b|_SOCKET_PATH\b)/.test(line)) return "process.env.HERDR is forbidden in scripts";
    if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden in scripts";
    return undefined;
  });

  const adapterFiles = scanDirectory("src/adapters", new Set(["adapter.ts"]), (line, relPath) => {
    const launchEnvViolation = checkLaunchEnvLine(line, relPath);
    if (launchEnvViolation) return launchEnvViolation;
    const presenceViolation = checkPresenceFilenameLine(line, relPath);
    if (presenceViolation) return presenceViolation;
    if (line.includes("HERDR_PANE_ID")) return "HERDR_PANE_ID is forbidden in agent adapters";
    if (line.includes("TMUX_PANE")) return "TMUX_PANE is forbidden in agent adapters";
    if (line.includes("process.env.HERDR")) return "process.env.HERDR is forbidden in agent adapters";
    if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden in agent adapters";
    if (line.includes('from "../backends/')) return "backend imports are forbidden in agent adapters";
    if (line.includes("from '../backends/")) return "backend imports are forbidden in agent adapters";
    return undefined;
  });

  const backendFiles = scanDirectory("src/backends", new Set(), (line, relPath) => {
    const launchEnvViolation = checkLaunchEnvLine(line, relPath);
    if (launchEnvViolation) return launchEnvViolation;
    const environmentCapabilityViolation = checkEnvironmentCapabilityLine(line, relPath);
    if (environmentCapabilityViolation) return environmentCapabilityViolation;
    const backendEnvViolation = checkBackendEnvLine(line, relPath);
    if (backendEnvViolation) return backendEnvViolation;
    const presenceViolation = checkPresenceFilenameLine(line, relPath);
    if (presenceViolation) return presenceViolation;
    if (new RegExp(`from\\s+["']\\.\\.\\/adapters\\/(?:${alternation(HARNESS_IDS)})\\.ts["']`).test(line)) {
      return "agent adapter imports are forbidden in backends";
    }
    if (HARNESS_ID_LITERAL.test(line)) {
      if (BACKEND_KIND_MAP_ALLOWLIST.get(relPath)?.has(line.trim())) return undefined;
      return "agent id literals are forbidden in backends";
    }
    return undefined;
  }, true);

  const coreScopeFiles = scanCoreScope();
  // Rule 11's "Why" is a renderer that printed a plexer coordinate as a name and
  // bucketed every detached agent under `local`. A package is core's consumer,
  // not a concrete plexer, so the identity-branch rule governs it exactly as it
  // governs src/**: adding an environment must edit zero renderers.
  const packageFiles = scanPackagesSrc((line, relPath) => {
    const environmentCapabilityViolation = checkEnvironmentCapabilityLine(line, relPath);
    if (environmentCapabilityViolation) return environmentCapabilityViolation;
    return checkPackageImportLine(line);
  });
  const dispatcherScopeFiles = scanDirectory("src", new Set(), checkDispatcherCallLine, true);
  const spawnerReplyFiles = scanDirectory("src", new Set(), checkSpawnerReplyFallbackLine, true);
  const identityConstructionFiles = scanDirectory("src", new Set(), (line, relPath) => {
    if (IDENTITY_CONSTRUCTION_ALLOWLIST.get(relPath)?.has(line.trim())) return undefined;
    return checkIdentityConstructionLine(line, relPath);
  }, true);
  const commandParserFiles = scanDirectory("src/commands", new Set(), checkCommandsParserLine, true);
  const leaseProvenanceFiles = scanDirectory("src/store", new Set(), checkLeaseProvenanceLine, true);

  const scanned =
    bridgeSourceFiles + extensionFiles + scriptFiles + adapterFiles + backendFiles +
    coreScopeFiles + packageFiles + dispatcherScopeFiles + spawnerReplyFiles +
    identityConstructionFiles + commandParserFiles + leaseProvenanceFiles;
  console.log(`check:bridge OK (${scanned} files scanned)`);
}

if (import.meta.main) runAllChecks();
