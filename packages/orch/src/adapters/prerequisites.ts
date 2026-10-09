import { hostOs, isNixOs } from "../host.ts";
import type { InstallCommands, Prerequisite } from "../types/adapter.ts";

function posix(command: string): InstallCommands {
  return { linux: command, darwin: command };
}

function everywhere(command: string): InstallCommands {
  return { linux: command, darwin: command, windows: command };
}

export const PREREQUISITES: Record<string, Prerequisite> = {
  // bun is never probed on its own — it surfaces only as pi's declared dependency.
  pi: { install: everywhere("bun add -g @earendil-works/pi-coding-agent"), needs: ["bun"], signIn: "pi auth" },
  omp: { install: everywhere("bun add -g @oh-my-pi/pi-coding-agent"), needs: ["bun"], signIn: "omp setup" },
  claude: { install: { ...posix("curl -fsSL https://claude.ai/install.sh | bash"), windows: "irm https://claude.ai/install.ps1 | iex" }, signIn: "claude auth" },
  codex: { docsUrl: "https://github.com/openai/codex", signIn: "codex login" },
  bun: { install: { ...posix("curl -fsSL https://bun.sh/install | bash"), windows: "irm bun.sh/install.ps1 | iex" } },
  tmux: { docsUrl: "https://github.com/tmux/tmux/wiki/Installing" },
  herdr: {
    install: { ...posix("curl -fsSL https://herdr.dev/install.sh | sh"), windows: "irm https://herdr.dev/install.ps1 | iex" },
    docsUrl: "https://herdr.dev/docs/install/",
    recommended: true,
  },
  orca: { docsUrl: "https://github.com/stablyai/orca#install" },
  "notify-send": { install: { linux: "sudo apt install libnotify-bin" } },
};

export function isRecommended(id: string): boolean {
  return PREREQUISITES[id]?.recommended === true;
}

/** The command that installs a tool on this host. NixOS users install through Nix, so they get none. */
export function installCommand(id: string): string | null {
  if (isNixOs()) return null;
  return PREREQUISITES[id]?.install?.[hostOs()] ?? null;
}

/** The one command that re-picks a harness's default and allowlist after its catalogue changes. */
export function repickCommand(harnessId: string): string {
  return `orch settings models --harness=${harnessId}`;
}

/** The fix orch offers a harness that enumerates nothing. Every surface that reports an
 *  empty catalogue — setup, doctor, settings — says it from here, so the commands cannot
 *  drift apart the way a hand-written copy already had. */
export function signedOutFix(harnessId: string): string {
  const signIn = PREREQUISITES[harnessId]?.signIn;
  const first = signIn ? `sign ${harnessId} in (${signIn})` : `finish setting up your ${harnessId} install`;
  return `${first}, then run: ${repickCommand(harnessId)}`;
}
