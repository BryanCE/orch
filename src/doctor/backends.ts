import { allBackends, detectBackends, getBackend } from "../backends/registry.ts";
import { SUPPORTED_RANGES, supportedRange, versionInRange } from "../backends/versions.ts";
import type { CheckResult, DoctorBackendReport } from "../check-result.ts";

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
  if (configured) {
    const report = new Map(reports.map((entry) => [entry.id, entry])).get(configured);
    if (!report) return null;
    // An absent `enabled` means the backend never declared one, which reads as enabled.
    return (report.enabled ?? true) ? report : null;
  }
  const live = reports.find((report) => report.roles.includes("paneInventory") && (report.detected ?? report.available) && report.insideSession && (report.enabled ?? true));
  if (live) return live;
  return reports.find((report) => !report.roles.includes("paneInventory") && (report.enabled ?? true)) ?? null;
}

/** Every enabled backend must be detected; only the active one must be inside
 *  a live session. Requiring insideSession of all of them is unsatisfiable the
 *  moment two pane backends are enabled — you cannot be inside both a herdr
 *  and a tmux session at once, so the check could never pass (design D6).
 *
 *  Severity separates a broken install from situational context (11.3): a missing
 *  binary is a FAIL, but an available session-scoped active backend that merely
 *  reports insideSession=false reflects WHERE the command ran, not a broken
 *  install — that is a WARN naming the fix, and it never affects doctor's exit code. */
export function backendCapabilitiesVerdict(
  backends: readonly DoctorBackendReport[],
  configured?: string | null,
): CheckResult {
  const active = activeBackend(backends, configured);
  const unavailable = backends.filter((backend) => (backend.enabled ?? true) && !(backend.detected ?? backend.available)).map((backend) => backend.id);

  const failReasons: string[] = [];
  const warnReasons: string[] = [];
  if (unavailable.length) failReasons.push(`unavailable: ${unavailable.join(", ")}`);
  // headless reports insideSession=true unconditionally (it has no session
  // concept), so this rule needs no special case for it. An available active
  // backend outside its session is situational — warn, do not fail.
  if (active && (active.detected ?? active.available) && !active.insideSession)
    warnReasons.push(`active backend ${active.id} is not inside a live session - open a ${active.id} workspace and re-run`);

  const rows = backends.map((backend) => {
    const detected = backend.detected ?? backend.available;
    const enabled = backend.enabled ?? true;
    const isActive = backend === active || backend.active === true;
    return `${backend.id}${isActive ? " (active)" : ""}: detected=${detected}, enabled=${enabled}, active=${isActive}, insideSession=${backend.insideSession}, roles=${backend.roles.join(",") || "none"}`;
  });
  const summary = rows.join("\n    ") || "no supported backends";
  const reasons = [...failReasons, ...warnReasons];

  return {
    id: "backend-capabilities",
    label: "Backend capabilities",
    status: failReasons.length ? "fail" : warnReasons.length ? "warn" : "ok",
    detail: reasons.length ? `${reasons.join("; ")}\n    ${summary}` : summary,
    backends: [...backends],
  };
}

/** What this host can say about one plexer right now: whether its binary is
 *  here at all, and the version that binary reports. A plexer orch supports but
 *  the user never installed is a choice, not a defect — `installed` is only
 *  meaningful once `detected` is true. */
export interface BackendVersionObservation {
  plexerId: string;
  detected: boolean;
  installed: string | null;
}

/** Render the support-matrix comparison separately from host discovery so it is
 * deterministic and easy to test. An out-of-range install is a hard failure:
 * silently assuming a newer pre-1.0 integration is exactly the drift this check
 * is intended to prevent. */
export function backendVersionsVerdict(observations: readonly BackendVersionObservation[]): CheckResult {
  const rows: string[] = [];
  const failures: string[] = [];
  const unreadable: string[] = [];
  for (const { plexerId, detected, installed } of observations) {
    const range = supportedRange(plexerId);
    if (!range) continue;
    if (!detected) {
      rows.push(`${plexerId}: not installed`);
    } else if (!installed) {
      const reason = `${plexerId}: installed but '${plexerId} --version' reported no version orch could read (supported ${range})`;
      unreadable.push(reason);
      rows.push(reason);
    } else if (versionInRange(installed, range)) {
      rows.push(`${plexerId}: installed ${installed}, supported ${range} (in range)`);
    } else {
      const reason = `${plexerId}: installed ${installed} is outside orch's supported ${range}; update orch`;
      failures.push(reason);
      rows.push(reason);
    }
  }
  const reasons = [...failures, ...unreadable];
  return {
    id: "backend-versions",
    label: "Backend versions",
    status: failures.length ? "fail" : unreadable.length ? "warn" : "ok",
    detail: reasons.length ? `${reasons.join("; ")}\n    ${rows.join("\n    ")}` : rows.join("\n    ") || "no supported plexers",
  };
}

/** Ask each supported plexer on this machine what it is, then compare against
 * orch's declared range. The binary is the fact; the store's install history is
 * a record of past sessions and answers nothing about a fresh checkout. */
export function checkBackendVersions(): CheckResult {
  const detected = detectBackends();
  const observations = Object.keys(SUPPORTED_RANGES).map((plexerId) => {
    const here = detected.get(plexerId)?.detected ?? false;
    return { plexerId, detected: here, installed: here ? getBackend(plexerId)?.versionInfo?.installed() ?? null : null };
  });
  return backendVersionsVerdict(observations);
}

export function checkBackendCapabilities(
  enabledIds: readonly string[] = allBackends().map((backend) => backend.id),
  configured?: string | null,
): CheckResult {
  const enabled = new Set(enabledIds);
  const detected = detectBackends();
  const candidates = allBackends();
  const reports: DoctorBackendReport[] = candidates.map((backend) => {
    const probe = detected.get(backend.id)!;
    const isEnabled = enabled.has(backend.id);
    return {
      id: backend.id,
      detected: probe.detected,
      enabled: isEnabled,
      active: false,
      available: probe.detected,
      insideSession: probe.insideSession,
      // The plexer's own grouping for the calling pane. Never read off an
      // identity: identity carries no environment (A1).
      space: backend.paneInventory?.current()?.workspace ?? null,
      roles: Object.entries({
        paneHost: backend.paneHost,
        paneInventory: backend.paneInventory,
        paneInput: backend.paneInput,
        paneForeground: backend.paneForeground,
        paneScreen: backend.paneScreen,
        paneZoom: backend.paneZoom,
        paneNaming: backend.paneNaming,
        agentNaming: backend.agentNaming,
        agentStatus: backend.agentStatus,
        groupHome: backend.groupHome,
        groupLayout: backend.groupLayout,
      }).filter((entry) => entry[1] !== null).map(([name]) => name),
    };
  });
  const active = activeBackend(reports, configured);
  for (const report of reports) report.active = report === active;
  return backendCapabilitiesVerdict(reports, configured);
}
