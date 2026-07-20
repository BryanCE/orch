import * as path from "node:path";

// Codex's notify wire format lives here, in the codex adapter family (law #2:
// one adapter module owns a foreign tool's entire wire surface). Leaf on
// purpose — imported by both the adapter's installShim() and the bundled
// extensions/codex/index.ts shim without pulling either's graph into the other.

/** Built notify shim inside a package root (source: extensions/codex/index.ts); plain ESM JS any runtime can run. */
export function codexNotifyShimPath(root: string): string {
  return path.join(root, "dist", "scripts", "codex-notify.js");
}

/**
 * Runtimes a user may run the notify shim with — whichever is on their PATH.
 * orch never requires one specific runtime; node, deno, and bun all work.
 * Order is the installer's preference when several are available.
 */
export const CODEX_NOTIFY_RUNTIMES = ["node", "deno", "bun"] as const;
export type CodexNotifyRuntime = (typeof CODEX_NOTIFY_RUNTIMES)[number];

/** argv codex's `notify` config key should invoke the shim with, under one runtime. */
export function codexNotifyArgv(shim: string, runtime: CodexNotifyRuntime): string[] {
  return runtime === "deno" ? ["deno", "run", "--allow-all", shim] : [runtime, shim];
}

/** Whether a raw TOML `notify` value already points at the orch shim (any runtime/path form). */
function isOrchNotifyValue(value: string): boolean {
  return value.includes("codex-notify");
}

/** Whether a raw TOML `notify` value is absent/empty and therefore safe to fill in. */
function isEmptyNotifyValue(value: string): boolean {
  return value === "" || value === "[]" || value === '""' || value === "''";
}

/** Outcome of a targeted edit of the top-level `notify` key in a codex config.toml body. */
export type CodexNotifyEdit =
  | { readonly status: "inserted" | "replaced"; readonly text: string }
  | { readonly status: "unchanged" }
  | { readonly status: "foreign"; readonly foreignValue: string }
  | { readonly status: "ambiguous" };

/**
 * Targeted single-line edit of the top-level `notify` key (D2a): replace an
 * orch-owned value, insert into an empty/absent key, and refuse — never
 * clobber — a foreign value. This is intentionally NOT a full TOML parser
 * (Rule 8 is deleting orch's hand-rolled one): it scans line-by-line, treats
 * anything from the first `[table]` header onward as out of the top-level
 * scope, and bails with `ambiguous` on anything it cannot confidently read
 * (a duplicate top-level `notify` key), leaving the file untouched.
 */
export function editCodexNotifyConfig(raw: string, argv: readonly string[]): CodexNotifyEdit {
  const desired = `notify = ${JSON.stringify(argv)}`;
  const lines = raw.trim().length ? raw.split(/\r?\n/) : [];
  let inTable = false;
  let matchIndex = -1;
  let matchValue = "";
  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index]!.trim();
    if (trimmed.startsWith("[")) { inTable = true; continue; }
    if (inTable || trimmed.startsWith("#")) continue;
    const match = /^notify\s*=\s*(.+)$/.exec(trimmed);
    if (!match) {
      if (/^notify\s*=/.test(trimmed)) return { status: "ambiguous" };
      continue;
    }
    const candidate = match[1]!.trim();
    // Refuse malformed notify literals rather than treating them as foreign
    // (or silently inserting a second key).
    if ((candidate.startsWith("[") && !candidate.endsWith("]"))
      || (candidate.startsWith("\"") && !candidate.endsWith("\""))
      || (candidate.startsWith("'") && !candidate.endsWith("'"))) return { status: "ambiguous" };
    if (matchIndex !== -1) return { status: "ambiguous" };
    matchIndex = index;
    matchValue = candidate;
  }

  const withLine = (index: number, line: string): string => {
    const next = [...lines];
    next[index] = line;
    return `${next.join("\n").replace(/\n+$/, "")}\n`;
  };

  if (matchIndex === -1) {
    const firstTable = lines.findIndex((entry) => entry.trim().startsWith("["));
    const insertAt = firstTable === -1 ? lines.length : firstTable;
    const next = [...lines];
    next.splice(insertAt, 0, desired);
    return { status: "inserted", text: `${next.join("\n").replace(/\n+$/, "")}\n` };
  }
  if (isEmptyNotifyValue(matchValue)) return { status: "inserted", text: withLine(matchIndex, desired) };
  if (isOrchNotifyValue(matchValue)) {
    if (matchValue === JSON.stringify(argv)) return { status: "unchanged" };
    return { status: "replaced", text: withLine(matchIndex, desired) };
  }
  return { status: "foreign", foreignValue: matchValue };
}
