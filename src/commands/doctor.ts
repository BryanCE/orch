import { applyFixes, runDoctor, type CheckResult } from "../doctor/runner.ts";
import { renderDoctorResults, pickFixes } from "../setup/doctor-wizard.ts";
import { withSpinner } from "../setup/io.ts";
import { orchDir } from "../presence/store.ts";
import { renderTable } from "../table.ts";

/** Only a genuine failure makes doctor exit non-zero. A warning names a situational condition
 * (outside a session, stale daemon code, a dead presence dir) that does not mean the install is
 * broken, so it is reported but never fails the command's exit code. */
function failExit(results: readonly CheckResult[]): void {
  if (results.some((result) => result.status === "fail")) process.exitCode = 1;
}

async function runInteractiveDoctor(initial: CheckResult[]): Promise<void> {
  let results = initial;
  renderDoctorResults(results);
  const fixable = results.filter((r) => r.fix && (r.id.startsWith("shim-") || r.id.startsWith("fleet-pair-"))).map((r) => ({ id: r.id, label: r.label, description: r.fix!.description, destructive: r.fix!.destructive }));
  const selected = await pickFixes(fixable);
  if (selected === null) return;
  if (selected.length) {
    const chosen = new Set(selected);
    const toApply = results.filter((r) => r.fix && !r.fix.destructive && (r.id.startsWith("shim-") || r.id.startsWith("fleet-pair-")) && chosen.has(r.id));
    withSpinner(
      `Applying ${toApply.length} fix${toApply.length === 1 ? "" : "es"}…`,
      "fixes applied",
      () => { for (const r of toApply) r.fix!.apply(); },
    );
    results = await runDoctor(orchDir());
    renderDoctorResults(results);
  }
  failExit(results);
}

export async function cmdDoctor(args: string[]) {
  const json = args.includes("--json");
  const yes = args.includes("-y") || args.includes("--yes");
  const fix = args.includes("--fix") || yes;
  let results = await runDoctor(orchDir());
  // A TTY session that did not demand json or an unattended -y apply gets the
  // interactive fix menu (bare `doctor` and `doctor --fix` both land here).
  if (!json && !yes && process.stdin.isTTY) return runInteractiveDoctor(results);
  // Unattended: -y (or --fix with no TTY to prompt on) applies every fix.
  const changes = fix
    ? applyFixes(results.filter((r) => !r.fix?.destructive && (r.id.startsWith("shim-") || r.id.startsWith("fleet-pair-")))).applied
    : [];
  if (fix && changes.length) results = await runDoctor(orchDir());
  if (json) {
    process.stdout.write(JSON.stringify({ results, changes }, null, 2) + "\n");
  } else {
    const rows = results.map((r) => [r.status.toUpperCase(), r.label, r.detail]);
    process.stdout.write(renderTable(["STATUS", "CHECK", "DETAIL"], rows, [8, 24, 80]) + "\n");
    if (changes.length) process.stdout.write("Changes made:\n" + changes.map((c) => `  - ${c}`).join("\n") + "\n");
  }
  failExit(results);
}
