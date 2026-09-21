import { packageManifest, shellQuote } from "../util.ts";
import type { CheckResult, SshRunner } from "../types/doctor.ts";
import type { HostSettings, OrchSettings } from "../types/settings.ts";

/** The configured remote hosts. An install with no settings.json has none — the subject of these
 * checks is the host list, so its absence is an honest empty answer, not a defect. */
function configuredHosts(settings: OrchSettings | null): [string, HostSettings][] {
  return Object.entries(settings?.hosts ?? {});
}

function hostDestination(name: string, host: HostSettings): string {
  if (!host.dest) throw new Error(`Host "${name}" has no SSH destination`);
  return host.dest;
}

function hostResult(id: string, label: string, failures: string[], total: number, failureStatus: "warn" | "fail"): CheckResult {
  if (!total) return { id, label, status: "ok", detail: "no remote hosts configured" };
  if (!failures.length) return { id, label, status: "ok", detail: `${total} configured host${total === 1 ? "" : "s"} passed` };
  return { id, label, status: failureStatus, detail: failures.join("; ") };
}

export async function checkRemoteReachability(settings: OrchSettings | null, runner: SshRunner): Promise<CheckResult> {
  await Promise.resolve();
  const hosts = configuredHosts(settings);
  const failures: string[] = [];
  for (const [name, host] of hosts) {
    try {
      const destination = hostDestination(name, host);
      const result = runner(destination, "true", { timeoutMs: 5000 });
      if (!result.ok) failures.push(`${name}: SSH unreachable (${result.stderr || "connection failed"}); fix: ssh -o BatchMode=yes -o ConnectTimeout=5 ${destination} true`);
    } catch (error) { failures.push(`${name}: SSH probe failed (${String(error)}); fix: ssh -o BatchMode=yes -o ConnectTimeout=5 ${host.dest || name} true`); }
  }
  return hostResult("remote-ssh", "Remote SSH reachability", failures, hosts.length, "fail");
}

export async function checkRemoteVersion(settings: OrchSettings | null, runner: SshRunner): Promise<CheckResult> {
  await Promise.resolve();
  const hosts = configuredHosts(settings);
  const failures: string[] = [];
  const local = packageManifest().version;
  for (const [name, host] of hosts) {
    const destination = hostDestination(name, host);
    const result = runner(destination, "orch --version", { timeoutMs: host.timeout_ms });
    const remote = /\b\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/.exec(result.stdout)?.[0];
    if (!result.ok || !remote || remote !== local) failures.push(`${name}: remote orch ${remote ?? "is not installed"} (local ${local}); fix: ssh ${destination} orch --version`);
  }
  return hostResult("remote-orch-version", "Remote orch version/schema", failures, hosts.length, "fail");
}

export async function checkRemoteOrchDir(settings: OrchSettings | null, runner: SshRunner): Promise<CheckResult> {
  await Promise.resolve();
  const hosts = configuredHosts(settings);
  const failures: string[] = [];
  for (const [name, host] of hosts) {
    const destination = hostDestination(name, host);
    const remoteDir = host.orch_dir ?? "${HOME}/.orch";
    const command = host.orch_dir
      ? `test -d ${shellQuote(remoteDir)} && test -w ${shellQuote(remoteDir)}`
      : 'test -d "${ORCH_DIR:-$HOME/.orch}" && test -w "${ORCH_DIR:-$HOME/.orch}"';
    const result = runner(destination, command, { timeoutMs: host.timeout_ms });
    if (!result.ok) {
      const fixDir = host.orch_dir ? shellQuote(host.orch_dir) : '"${ORCH_DIR:-$HOME/.orch}"';
      failures.push(`${name}: ORCH_DIR ${remoteDir} is missing or not writable; fix: ssh ${destination} 'mkdir -p ${fixDir} && test -w ${fixDir}'`);
    }
  }
  return hostResult("remote-orch-dir", "Remote ORCH_DIR", failures, hosts.length, "warn");
}
