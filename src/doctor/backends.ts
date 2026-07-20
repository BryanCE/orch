import { allBackends } from "../backends/registry.ts";
import type { CheckResult, DoctorBackendReport } from "../doctor-types.ts";

/** The backend orch would actually pick, given the configured default. Mirrors
 *  resolveBackend's probe order without throwing: doctor reports on a broken
 *  composition, it does not refuse to run on one.
 *
 *  Expressed through capabilities rather than backend ids — core never branches on
 *  which plexer it is looking at. "First available pane backend already inside a
 *  live session, else the sessionless one" is the same rule resolveBackend applies,
 *  and reports arrive in registry order, so the precedence matches too. */
function activeBackend(reports: readonly DoctorBackendReport[], configured?: string | null): DoctorBackendReport | null {
  // A configured id resolves through a registry lookup, never an equality branch:
  // core may key a map by id, it may not ask "is this the herdr one?".
  if (configured) return new Map(reports.map((report) => [report.id, report])).get(configured) ?? null;
  const live = reports.find((report) => report.panes && report.available && report.insideSession);
  if (live) return live;
  return reports.find((report) => !report.panes) ?? null;
}

/** Every installed backend must be available; only the active one must be inside
 *  a live session. Requiring insideSession of all of them is unsatisfiable the
 *  moment two pane backends are installed — you cannot be inside both a herdr
 *  and a tmux session at once, so the check could never pass (design D6). */
export function backendCapabilitiesVerdict(
  backends: readonly DoctorBackendReport[],
  configured?: string | null,
): CheckResult {
  const active = activeBackend(backends, configured);
  const unavailable = backends.filter((backend) => !backend.available).map((backend) => backend.id);

  const reasons: string[] = [];
  if (unavailable.length) reasons.push(`unavailable: ${unavailable.join(", ")}`);
  // headless reports insideSession=true unconditionally (it has no session
  // concept), so this rule needs no special case for it.
  if (active && !active.insideSession) reasons.push(`active backend ${active.id} is not inside a live session`);

  const rows = backends.map((backend) =>
    `${backend.id}${backend === active ? " (active)" : ""}: available=${backend.available}, insideSession=${backend.insideSession}, panes=${backend.panes}, focusable=${backend.focusable}, canSendKeys=${backend.canSendKeys}`);
  const summary = rows.join("\n    ") || "no installed backends";

  return {
    id: "backend-capabilities",
    label: "Backend capabilities",
    status: reasons.length ? "fail" : "ok",
    detail: reasons.length ? `${reasons.join("; ")}\n    ${summary}` : summary,
    backends: [...backends],
  };
}

/** Probe the installed backends, then apply the verdict. */
export function checkBackendCapabilities(
  ids: readonly string[] = allBackends().map((backend) => backend.id),
  configured?: string | null,
): CheckResult {
  const selected = new Set(ids);
  const backends: DoctorBackendReport[] = allBackends().filter((backend) => selected.has(backend.id)).map((backend) => ({
    id: backend.id,
    available: backend.isAvailable(),
    insideSession: backend.isInsideSession(),
    workspace: backend.currentIdentity?.()?.workspace ?? null,
    panes: backend.panes,
    focusable: backend.focusable,
    canSendKeys: backend.canSendKeys,
  }));
  return backendCapabilitiesVerdict(backends, configured);
}
