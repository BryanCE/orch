import type { OrchSettings } from "../types/settings.ts";

/** The setting that grants a registered caller write access to other settings.
 *  It never grants itself: only the human widens what an agent may change. */
export const AGENT_SETTINGS_GRANT = "agents.writable_settings";

/** Whether a REGISTERED caller (a spawned agent or a harness session) may write `key`.
 *  An UNREGISTERED caller is the human and is never asked. */
export function agentMayWriteSetting(settings: OrchSettings, key: string): boolean {
  if (key === AGENT_SETTINGS_GRANT) return false;
  return settings.agents.writable_settings.includes(key);
}

/** The refusal an agent reads when it writes a key outside its grant. */
export function agentSettingRefusal(settings: OrchSettings, key: string): string {
  const allowed = settings.agents.writable_settings.filter((granted) => granted !== AGENT_SETTINGS_GRANT);
  const may = allowed.length ? allowed.join(", ") : "(none)";
  return `${key} is operator-only for an agent. An agent may set: ${may}. The human widens that with: orch settings ${AGENT_SETTINGS_GRANT} '["<key>", ...]'`;
}
