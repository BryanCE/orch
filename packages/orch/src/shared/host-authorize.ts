// What the script that lets orch in on a host prints, and how its output reads: the line that
// says orch's key is in place, and the line naming the orch that key will start.

/** The line the script prints once orch's key is in place. */
export const AUTHORIZED_REPORT = "orch's key is authorized here.";

/** The line the script ends with: the orch the authorized line starts, or nothing found. */
export const ORCH_REPORT = "orch=";

function reportLines(output: string): string[] {
  return output.split(/\r?\n/).map((line) => line.trim());
}

/** Whether the script got as far as putting orch's key in place. */
export function authorizedIn(output: string): boolean {
  return reportLines(output).includes(AUTHORIZED_REPORT);
}

/** The orch a host reported, from what the script printed; null when it found none. */
export function reportedOrch(output: string): string | null {
  const report = reportLines(output).reverse().find((line) => line.startsWith(ORCH_REPORT));
  const path = report?.slice(ORCH_REPORT.length) ?? "";
  return path === "" ? null : path;
}
