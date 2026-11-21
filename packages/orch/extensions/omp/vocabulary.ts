// omp's own vocabulary: what it calls itself, its settle signal, and its built-in tools. The
// composition root and omp's adapter both read it here, so neither keeps a second list.
import type { HarnessIdentity } from "orch/core/types/agent.ts";
import type { ToolVocabulary } from "orch/core/policy/read-only.ts";

/** omp's built-in tools a read-only agent can keep: three that read, and `edit` and `write`, which change the file at `path`. */
export const OMP_TOOLS: ToolVocabulary = { reads: ["read", "grep", "glob"], writes: ["edit", "write"], pathField: "path" };

/** omp calls itself `omp`, and fires `session_stop` when a run will not auto-continue. */
export const OMP_IDENTITY: HarnessIdentity = { agentId: "omp", settleEvent: "session_stop", tools: OMP_TOOLS };
