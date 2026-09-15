import { existsSync } from "node:fs";
import { COMMANDS } from "../commands/registry.ts";
import { helpDocPath } from "../cli/doc.ts";
import type { CheckResult } from "../types/doctor.ts";

/** Every registered command ships its `help/<name>.md`. Declared against reality. */
export function checkHelpDocs(): CheckResult {
  const id = "help-docs";
  const label = "Help docs";
  const missing = COMMANDS.map((spec) => helpDocPath(spec.name)).filter((path) => !existsSync(path));
  if (missing.length === 0) return { id, label, status: "ok", detail: `${COMMANDS.length} commands documented` };
  return { id, label, status: "fail", detail: `missing: ${missing.join(", ")}` };
}
