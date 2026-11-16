// Leading orchs talking to each other: who counts as one, the switch that allows it, and the list.
import { agentById, liveAgents } from "../../store/agent-rows.ts";
import { agentView } from "../../store/agent-view.ts";
import { selfIdentityOf } from "../../identity/self.ts";
import { recordedProcessIsLive } from "../../process-place.ts";
import { repoRootOf } from "../../policy/space.ts";
import { term } from "../../policy/vocabulary.ts";
import type { AgentRow } from "../../types/store.ts";
import type { CallerCredential, OrchDir } from "../../types/core.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { PeerOrch } from "../client/protocol.ts";

const ORCH_PEERS_OFF = `${term("orch")} peers are off. The user turns them on with: orch settings fleet.orch_peers true`;

/** A leading orch is a harness session a human started: no spawner, or a raw terminal as its spawner. */
export function isLeadingOrch(orchDir: OrchDir, row: Pick<AgentRow, "kind" | "spawnedBy">): boolean {
  if (row.kind !== "session") return false;
  return row.spawnedBy === null || agentById(orchDir, row.spawnedBy)?.kind === "operator";
}

/** Whether both ends of a mail are leading orchs. */
export function joinsLeadingOrchs(orchDir: OrchDir, from: string, target: string): boolean {
  const sender = agentById(orchDir, from);
  const recipient = agentById(orchDir, target);
  return sender !== null && recipient !== null && isLeadingOrch(orchDir, sender) && isLeadingOrch(orchDir, recipient);
}

/** Throws unless the human turned `fleet.orch_peers` on. */
export function requireOrchPeers(fleet: Pick<OrchSettings["fleet"], "orch_peers">): void {
  if (!fleet.orch_peers) throw new Error(ORCH_PEERS_OFF);
}

/** The id of a caller that is a leading orch; any other caller is refused. */
function leadingCallerId(orchDir: OrchDir, credential: CallerCredential): string {
  const id = selfIdentityOf(orchDir, credential)?.id;
  const row = id === undefined ? null : agentById(orchDir, id);
  if (id === undefined || row === null || !isLeadingOrch(orchDir, row)) {
    throw new Error(`only a leading ${term("orch")}, a harness session a human started, may reach other ${term("orch")}s`);
  }
  return id;
}

function peerOrchOf(orchDir: OrchDir, id: string): PeerOrch | null {
  const view = agentView(orchDir, id);
  if (view === null) return null;
  const { cwd, space, host } = view.environment;
  return { id, name: view.name, label: view.label, harness: view.harnessId, space, host: host.name, cwd, project: repoRootOf(cwd) ?? cwd };
}

/** Every other live leading orch, for a caller that is one, while `fleet.orch_peers` is on. */
export function peerOrchs(orchDir: OrchDir, settings: OrchSettings, credential: CallerCredential): PeerOrch[] {
  requireOrchPeers(settings.fleet);
  const callerId = leadingCallerId(orchDir, credential);
  return liveAgents(orchDir)
    .filter((row) => row.id !== callerId && isLeadingOrch(orchDir, row) && recordedProcessIsLive(orchDir, row.id))
    .map((row) => peerOrchOf(orchDir, row.id))
    .filter((orch) => orch !== null);
}
