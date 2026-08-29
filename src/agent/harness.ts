/**
 * The harness surface orch's in-agent control plane runs against.
 *
 * This is orch's OWN port, not any harness's API: nothing here imports a harness
 * package, so `src/agent/**` typechecks, bundles and runs with none of them
 * installed. Each harness's composition root (`extensions/<harness>/index.ts`)
 * imports its own package's types and hands its live API in — pi and omp both
 * satisfy this structurally, and a build that stops satisfying it fails in its
 * own directory rather than silently degrading the shared plane.
 *
 * It is deliberately the SUBSET the control plane actually uses. Widening it to
 * mirror a harness's full ExtensionAPI would re-couple every consumer to whichever
 * harness the extra members were copied from.
 */
import type { ThinkingLevel } from "../policy/thinking.ts";
import type { HarnessApi, HarnessCommandHandler, HarnessContext, HarnessContextUsage, HarnessEventBus, HarnessEventHandler, HarnessIdentity, HarnessModelRegistry, HarnessResolvedModel, HarnessSessionManager, HarnessTool, HarnessUi } from "../types/agent.ts";

