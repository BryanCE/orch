import { installCommand } from "../adapters/prerequisites.ts";
import { soundTierBinaries } from "./ding.ts";
import { isWsl } from "../host.ts";

const DEFAULT_REMEDIATION = "fix: verify the adapter installation and configuration";

/** Explain the one-step fix for a notifier that cannot deliver on this host. */
export function notifierRemediation(
  id: string,
  config: Record<string, unknown> = {},
  declared?: string,
): string {
  if (declared) return declared;
  if (id === "desktop") {
    const notifySendInstall = installCommand("notify-send");
    if (!notifySendInstall) return DEFAULT_REMEDIATION;
    return isWsl()
      ? `fix: install notify-send (\`${notifySendInstall}\`) or ensure powershell.exe and wslpath are reachable`
      : `fix: install notify-send (\`${notifySendInstall}\`)`;
  }
  if (id === "sound") {
    return `fix: install a sound player this host can use (${soundTierBinaries().join(" or ")})`;
  }
  if (id === "command") {
    const command = Array.isArray(config.command) && typeof config.command[0] === "string" ? config.command[0] : "the command";
    return `fix: install ${command}, or put it on PATH`;
  }
  return DEFAULT_REMEDIATION;
}
