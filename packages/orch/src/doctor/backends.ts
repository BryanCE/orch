import { allBackends, detectBackends } from "../backends/registry.ts";
import { versionInRange } from "../backends/versions.ts";
import type { ServerInfoRole, ServerReport } from "../types/backend.ts";
import type { BackendVersionObservation, CheckResult, DoctorBackendReport } from "../types/doctor.ts";

/** The backend orch would actually pick, given the configured default. Mirrors
 *  resolveBackend's probe order without throwing: doctor reports on a broken
 *  composition, it does not refuse to run on one.
 *
 *  Expressed through composed environment roles rather than backend ids — core
 *  never branches on which plexer it is looking at. "First available pane backend already inside a
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
  const live = reports.find((report) => report.roles.includes("paneInventory") && report.detected && report.insideSession && (report.enabled ?? true));
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
  const unavailable = backends.filter((backend) => (backend.enabled ?? true) && !backend.detected).map((backend) => backend.id);

  const failReasons: string[] = [];
  const warnReasons: string[] = [];
  if (unavailable.length) failReasons.push(`unavailable: ${unavailable.join(", ")}`);
  // headless reports insideSession=true unconditionally (it has no session
  // concept), so this rule needs no special case for it. An available active
  // backend outside its session is situational — warn, do not fail.
  if (active?.detected && !active.insideSession)
    warnReasons.push(`active backend ${active.id} is not inside a live session - open a ${active.id} workspace and re-run`);

  const rows = backends.map((backend) => {
    const detected = backend.detected;
    const enabled = backend.enabled ?? true;
    const isActive = backend === active || backend.active === true;
    return `${backend.id}${isActive ? " (active)" : ""}: detected=${detected}, enabled=${enabled}, active=${isActive}, insideSession=${backend.insideSession}, roles=${backend.roles.join(",") || "none"}`;
  });
  const summary = rows.join("\n    ") || "no supported backends";
  const reasons = [...failReasons, ...warnReasons];

  return {
    id: "backend-environments",
    label: "Backend environments",
    status: failReasons.length ? "fail" : warnReasons.length ? "warn" : "ok",
    detail: reasons.length ? `${reasons.join("; ")}\n    ${summary}` : summary,
    backends: [...backends],
  };
}

/** How a client/server plexer's server reads on a report row. An absent server
 *  role and an absent server both say nothing; only a fact gets printed. */
function serverRow(server: ServerReport | null | undefined): string {
  if (!server) return "";
  const compatibility = server.compatible === null ? "compatibility unknown" : server.compatible ? "compatible" : "INCOMPATIBLE";
  return `, server ${server.version ?? "unknown"} (${compatibility})`;
}

/** A server the installed client cannot fully drive. Since herdr 0.9.0 a client
 *  still connects to a server it outgrew and loses individual actions instead,
 *  so the mismatch has to be named here or it surfaces as one unexplained
 *  command failure later. */
function serverMismatch(plexerId: string, server: ServerReport | null | undefined): string | null {
  if (server?.compatible !== false) return null;
  return `${plexerId}: the running server ${server.version ?? "of unknown version"} is not compatible with the installed client; restart the ${plexerId} server`;
}

/** Render the support-matrix comparison separately from host discovery so it is
 * deterministic and easy to test. An install below the floor is a hard failure:
 * orch calls commands that plexer does not have yet. */
export function backendVersionsVerdict(observations: readonly BackendVersionObservation[]): CheckResult {
  const rows: string[] = [];
  const failures: string[] = [];
  const unreadable: string[] = [];
  for (const { plexerId, range, detected, installed, server } of observations) {
    if (!detected) {
      rows.push(`${plexerId}: not installed`);
    } else if (!installed) {
      const reason = `${plexerId}: installed but '${plexerId} --version' reported no version orch could read (supported ${range})`;
      unreadable.push(reason);
      rows.push(reason);
    } else if (versionInRange(installed, range)) {
      rows.push(`${plexerId}: installed ${installed}, supported ${range} (in range)${serverRow(server)}`);
    } else {
      const reason = `${plexerId}: installed ${installed} is older than orch's supported ${range}; update ${plexerId}`;
      failures.push(reason);
      rows.push(reason);
    }
    const mismatch = serverMismatch(plexerId, server);
    if (mismatch) failures.push(mismatch);
  }
  const reasons = [...failures, ...unreadable];
  return {
    id: "backend-versions",
    label: "Backend versions",
    status: failures.length ? "fail" : unreadable.length ? "warn" : "ok",
    detail: reasons.length ? `${reasons.join("; ")}\n    ${rows.join("\n    ")}` : rows.join("\n    ") || "no supported plexers",
  };
}

/** Asking a plexer about its server is itself a socket call. Doctor reports on a
 *  plexer it cannot reach; it never dies on one, so an unreachable server reads
 *  the same as none running. */
function reportedServer(serverInfo: ServerInfoRole | null | undefined): ServerReport | null {
  try {
    return serverInfo?.running() ?? null;
  } catch {
    return null;
  }
}

/** Ask each integration what version of its own environment it speaks to, then what
 * is installed here. The binary is the fact; the store's install history is a record
 * of past sessions and answers nothing about a fresh checkout.
 *
 * An integration that reports no version at all declares no floor either, so it has
 * nothing for this check to compare and never appears - which is why the list comes
 * from the registry and not from a set of ids core would have to hold. */
export function checkBackendVersions(): CheckResult {
  const detected = detectBackends();
  const observations = allBackends().flatMap((backend) => {
    const versionInfo = backend.versionInfo;
    if (!versionInfo) return [];
    const here = detected.get(backend.id)?.detected ?? false;
    return [{
      plexerId: backend.id,
      range: versionInfo.supported(),
      detected: here,
      installed: here ? versionInfo.installed() : null,
      server: here ? reportedServer(backend.serverInfo) : null,
    }];
  });
  return backendVersionsVerdict(observations);
}

export function describeBackendEnvironments(
  enabledIds: readonly string[] = allBackends().map((backend) => backend.id),
  configured?: string | null,
): CheckResult {
  const enabled = new Set(enabledIds);
  const candidates = allBackends();
  const reports: DoctorBackendReport[] = candidates.map((backend) => {
    const detected = backend.isAvailable();
    const insideSession = backend.isInsideSession();
    const isEnabled = enabled.has(backend.id);
    return {
      id: backend.id,
      detected,
      enabled: isEnabled,
      active: false,
      insideSession,
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
        spaceHome: backend.spaceHome,
        identity: backend.identity,
        handleLookup: backend.handleLookup,
        logPruning: backend.logPruning,
        versionInfo: backend.versionInfo,
        serverInfo: backend.serverInfo,
      }).filter((entry) => entry[1] !== null).map(([name]) => name),
    };
  });
  const active = activeBackend(reports, configured);
  for (const report of reports) report.active = report === active;
  return backendCapabilitiesVerdict(reports, configured);
}
