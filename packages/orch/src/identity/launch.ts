import { isAgentId, type AgentId } from "../backends/identity.ts";
import { CommandRefusal } from "../refusal.ts";

export const LAUNCH_ENV = "ORCH_AGENT_ID";

export type LaunchCredential =
  | { readonly kind: "absent" }
  | { readonly kind: "malformed"; readonly value: string }
  | { readonly kind: "ok"; readonly id: AgentId };

export function readLaunchCredential(): LaunchCredential {
  const value = process.env[LAUNCH_ENV];
  if (value === undefined || value === "") return { kind: "absent" };
  if (isAgentId(value)) return { kind: "ok", id: value };
  return { kind: "malformed", value };
}

export function launchCredential(): AgentId | null {
  const launch = readLaunchCredential();
  switch (launch.kind) {
    case "absent":
      return null;
    case "ok":
      return launch.id;
    case "malformed":
      throw new CommandRefusal(`${LAUNCH_ENV} is set but is not an agent id: ${JSON.stringify(launch.value)}`);
    default: {
      const exhaustive: never = launch;
      throw new Error(`Unhandled launch credential kind: ${String(exhaustive)}`);
    }
  }
}
