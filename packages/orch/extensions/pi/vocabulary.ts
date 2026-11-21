// pi's own vocabulary: what it calls itself, its settle signal, and its built-in tools. The
// composition root and pi's adapter both read it here, so neither keeps a second list.
import type { HarnessIdentity } from "orch/core/types/agent.ts";
import type { ToolVocabulary } from "orch/core/policy/write-root.ts";

/** pi's built-in tools a write-root agent keeps: four that read, and `edit` and `write`, which change the file at `path`. */
export const PI_TOOLS: ToolVocabulary = { reads: ["read", "grep", "find", "ls"], writes: ["edit", "write"], pathField: "path" };

/** pi calls itself `pi`, and fires `agent_settled` when a run will not auto-continue. */
export const PI_IDENTITY: HarnessIdentity = { agentId: "pi", settleEvent: "agent_settled", tools: PI_TOOLS };
