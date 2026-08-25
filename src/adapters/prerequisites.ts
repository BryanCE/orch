/** What one provider id needs to be usable: exactly one of a real install command or a
 * documentation URL, an optional ordered list of prerequisite provider ids installed
 * first, and the provider's own command for signing in — installed is not the same as
 * usable, and a harness with no credentials enumerates no models.
 * Keyed by real provider id, so a prerequisite can never drift from its provider. */
export interface Prerequisite {
  install?: string;
  docsUrl?: string;
  needs?: readonly string[];
  signIn?: string;
}

export const PREREQUISITES: Record<string, Prerequisite> = {
  // bun is never probed on its own — it surfaces only as pi's declared dependency.
  pi: { install: "bun add -g @earendil-works/pi-coding-agent", needs: ["bun"], signIn: "pi auth" },
  omp: { install: "bun add -g @oh-my-pi/pi-coding-agent", needs: ["bun"], signIn: "omp setup" },
  claude: { install: "curl -fsSL https://claude.ai/install.sh | bash", signIn: "claude auth" },
  codex: { docsUrl: "https://github.com/openai/codex", signIn: "codex login" },
  bun: { install: "curl -fsSL https://bun.sh/install | bash" },
  tmux: { docsUrl: "https://github.com/tmux/tmux/wiki/Installing" },
  herdr: { docsUrl: "https://github.com/BryanCE/orch#readme" },
  "notify-send": { install: "sudo apt install libnotify-bin" },
};

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
