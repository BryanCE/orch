// Leaf module on purpose: the bundled writers (extensions/orchestrator-bridge.ts,
// scripts/claude-hooks.ts) inline their imports and must not drag store.ts's
// sqlite graph into their bundles.

/** The one presence status.json schema. Pre-publish there is no legacy support:
 * every record stamps exactly this value; anything else is malformed and gets
 * reaped. On a shape change, bump this and fix every writer/reader/test in the
 * same commit. */
export const PRESENCE_SCHEMA = 2;
