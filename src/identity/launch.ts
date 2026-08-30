import { join } from "node:path";
import { isAgentId } from "../backends/identity.ts";
import { createLogger } from "../log.ts";
import { orchDir } from "../presence/writer.ts";

export const LAUNCH_ENV = "ORCH_AGENT_KEY";

export function launchCredential(): string | null {
  const value = process.env[LAUNCH_ENV];
  if (!value) return null;
  if (isAgentId(value)) return value;
  createLogger({ file: join(orchDir(), "orch.log"), level: "error" }).error("launch.invalid-key", {
    error: "malformed identity key",
  });
  process.exit(1);
}
