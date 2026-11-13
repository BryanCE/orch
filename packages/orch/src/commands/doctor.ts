import { parseCommand } from "./registry.ts";
import { askDaemon } from "./daemon.ts";
import { renderDoctorResults, pickFixes } from "../setup/doctor-wizard.ts";
import { withSpinner } from "../setup/io.ts";
import { timeoutMs } from "./machine.ts";
import { errorMessage } from "../util.ts";
import type { DaemonClient } from "../types/services.ts";
import { renderTable } from "../table.ts";
import type { CheckFinding } from "../types/doctor.ts";
import type { ParamsOf, ResultOf } from "../daemon/client/protocol.ts";

/** Only a genuine failure makes doctor exit non-zero. A warning names a situational condition
 * (outside a session, stale daemon code, a dead presence dir) that does not mean the install is
 * broken, so it is reported but never fails the command's exit code. */
function failExit(results: readonly CheckFinding[]): void {
  if (results.some((result) => result.status === "fail")) process.exitCode = 1;
}

/** Run doctor's checks in orchd, which checks itself and this machine; with `fix`, its fixes too. */
export function askDoctor(services: DaemonClient, params: ParamsOf<"doctor">): Promise<ResultOf<"doctor">> {
  return askDaemon(services, "doctor", params, timeoutMs(services, "machine_ms"));
}

/** The one check the CLI answers itself: whether it reached orchd, which runs every other. */
function unreachedOrchd(error: unknown): CheckFinding {
  return { id: "orchd-reach", label: "orchd reach", status: "fail", detail: `this CLI could not reach orchd: ${errorMessage(error)}` };
}

async function runInteractiveDoctor(initial: readonly CheckFinding[], services: DaemonClient): Promise<void> {
  let results = initial;
  renderDoctorResults(results);
  const fixable = results.flatMap((r) => r.fix ? [{ id: r.id, label: r.label, description: r.fix.description, destructive: r.fix.destructive }] : []);
  const selected = await pickFixes(fixable);
  if (selected === null) return;
  if (selected.length) {
    const chosen = new Set(selected);
    const toApply = results.filter((r) => r.fix && !r.fix.destructive && chosen.has(r.id)).map((r) => r.id);
    const answer = await withSpinner(
      `Applying ${toApply.length} fix${toApply.length === 1 ? "" : "es"}...`,
      "fixes applied",
      () => askDoctor(services, { fix: true, only: toApply }),
    );
    results = answer.results;
    renderDoctorResults(results);
  }
  failExit(results);
}

export async function cmdDoctor(services: DaemonClient, args: string[]) {
  const { flags } = parseCommand("doctor", args);
  const json = flags.has("--json");
  const yes = flags.has("--yes");
  // A TTY session that did not demand json or an unattended -y apply gets the
  // interactive fix menu (bare `doctor` and `doctor --fix` both land here).
  const interactive = !json && !yes && process.stdin.isTTY;
  // Unattended: -y (or --fix with no TTY to prompt on) applies every fix, and every fix those uncover.
  const fix = !interactive && (flags.has("--fix") || yes);
  let answer: ResultOf<"doctor">;
  try {
    answer = await askDoctor(services, { fix });
  } catch (error: unknown) {
    answer = { results: [unreachedOrchd(error)], changes: [] };
  }
  if (interactive) return runInteractiveDoctor(answer.results, services);
  const { results, changes } = answer;
  if (json) {
    process.stdout.write(JSON.stringify({ results, changes }, null, 2) + "\n");
  } else {
    const rows = results.map((r) => [r.status.toUpperCase(), r.label, r.detail]);
    process.stdout.write(renderTable(["STATUS", "CHECK", "DETAIL"], rows, [8, 24]) + "\n");
    if (changes.length) process.stdout.write("Changes made:\n" + changes.map((c) => `  - ${c}`).join("\n") + "\n");
  }
  failExit(results);
}
