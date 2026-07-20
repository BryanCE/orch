import type { CheckResult } from "../doctor-types.ts";
import { promptMultiselect } from "./io.ts";

const green = (value: string): string => `\x1b[32m${value}\x1b[0m`;
const yellow = (value: string): string => `\x1b[33m${value}\x1b[0m`;
const red = (value: string): string => `\x1b[31m${value}\x1b[0m`;
const gray = (value: string): string => `\x1b[2m${value}\x1b[0m`;

const colorByStatus = { ok: green, warn: yellow, fail: red, skip: gray } as const;

/** Print one colored line per check: green ok, yellow warn, red fail, dim skip. */
export function renderDoctorResults(results: readonly CheckResult[]): void {
  const lines = results.map(({ status, label, detail }) =>
    `${colorByStatus[status](status.toUpperCase().padEnd(5))}  ${label.padEnd(24)}  ${detail}`);
  process.stdout.write(`${lines.join("\n")}\n`);
}

/** Multi-select which fixable findings to apply; null when the user cancels, [] when nothing is fixable.
 *  Destructive fixes are labeled and left unchecked so a blind Enter never deletes data. */
export function pickFixes(fixable: readonly { id: string; label: string; description: string; destructive?: boolean }[]): Promise<string[] | null> {
  return promptMultiselect(
    "Select fixes to apply (destructive ones are unchecked — review before selecting)",
    fixable.map(({ id, label, description, destructive }) => ({
      value: id,
      label: destructive ? `⚠ ${label} (deletes data)` : label,
      hint: description,
      checked: !destructive,
    })),
  );
}
