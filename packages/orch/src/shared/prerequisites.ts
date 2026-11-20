import type { HostOs } from "../types/host.ts";
import type { AcpRole, AgentAdapter, InstallCommands, Prerequisite } from "../types/adapter.ts";

/** Each binding executable the adapters declare, with the role that declares it, once per executable. */
export function bindingPrerequisites(adapters: readonly AgentAdapter[]): { readonly command: string; readonly acp: AcpRole }[] {
  const bindings = new Map<string, AcpRole>();
  for (const adapter of adapters) {
    if (!adapter.acp) continue;
    const [command] = adapter.acp.argv({});
    if (!command) throw new Error(`${adapter.id} declares an empty binding argv`);
    if (!bindings.has(command)) bindings.set(command, adapter.acp);
  }
  return [...bindings].map(([command, acp]) => ({ command, acp }));
}

export function posix(command: string): InstallCommands {
  return { linux: command, darwin: command };
}

export function everywhere(command: string): InstallCommands {
  return { linux: command, darwin: command, windows: command };
}

/** Tools orch itself needs, or that a provider names in its `needs`. A harness or backend declares its own install facts on its port. */
export const PREREQUISITES: Record<string, Prerequisite> = {
  bun: { install: { ...posix("curl -fsSL https://bun.sh/install | bash"), windows: "irm bun.sh/install.ps1 | iex" } },
  "notify-send": { install: { linux: "sudo apt install libnotify-bin" } },
};

/** The command that installs a tool on this host. NixOS users install through Nix, so they get none.
 *  The caller states the host it runs on: this module reads no host facts itself. */
export function installCommand(entry: Prerequisite | undefined, nixos: boolean, os: HostOs): string | null {
  if (nixos) return null;
  return entry?.install?.[os] ?? null;
}

/** The one command that re-picks a harness's default and allowlist after its catalogue changes. */
export function repickCommand(harnessId: string): string {
  return `orch settings models --harness=${harnessId}`;
}

/** The fix orch offers a harness that enumerates nothing. Every surface that reports an
 *  empty catalogue — setup, doctor, settings — says it from here, so the commands cannot
 *  drift apart the way a hand-written copy already had. */
export function signedOutFix(harnessId: string, signIn: string | null): string {
  const first = signIn ? `sign ${harnessId} in (${signIn})` : `finish setting up your ${harnessId} install`;
  return `${first}, then run: ${repickCommand(harnessId)}`;
}
