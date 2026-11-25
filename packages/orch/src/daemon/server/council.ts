// The council: agents on different models that review one subject and score it, round by
// round. orchd convenes one, sends each round, scores a member's round file when its run
// finishes, and closes it. Every member is a read-only agent whose output directory is its own
// directory under the council's.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { councilStop, roundMeans, stopReason } from "../../council/stop.ts";
import { councilDirectory, memberDirectory, roundFilePath } from "../../council/layout.ts";
import { memberTabs } from "../../council/lineup.ts";
import { memberPrompt } from "../../council/prompt.ts";
import { parseRoundFile } from "../../council/round-file.ts";
import { workerHeaderContextOf } from "../../policy/spawner.ts";
import { appendScore } from "../../presence/history.ts";
import { hereAgentIfAny } from "../../process-place.ts";
import { CommandRefusal } from "../../refusal.ts";
import { isAdapterId } from "../../shared/harness.ts";
import { agentView } from "../../store/agent-view.ts";
import { askReview, closeCouncil, councilAt, councilMembersOf, councilReviewsOf, insertCouncil, lastRound, scoreReview, waitingReview } from "../../store/council-rows.ts";
import { selectRun } from "../../store/run-rows.ts";
import { errorMessage } from "../../util.ts";
import { closeAnywhere } from "./handlers/drive.ts";
import { clearSession } from "./handlers/lifecycle.ts";
import { callerSelf } from "./handlers/self.ts";
import { dispatch, steer } from "./handlers/write.ts";
import { joinSpawned, spawnAgents, type SpawnedFleet } from "./spawn/index.ts";
import type { ParamsOf, ResultOf } from "../client/protocol.ts";
import type { DaemonState } from "./state.ts";
import type { OrchDir } from "../../types/core.ts";
import type { CouncilMember, CouncilRecord, CouncilStop, ReviewOutcome, ReviewRecord } from "../../types/council.ts";
import type { AgentView, RunRecord } from "../../types/store.ts";

/** The governed fields of a council request: who asks, as orchd stamped it. */
type Asker = Pick<ParamsOf<"council-round">, "caller" | "actor" | "actorSpace" | "actorIsOperator" | "steal" | "crossSpace">;

/** What every council request names: the council, and the directory it was convened from. */
type CouncilRef = Pick<ParamsOf<"council-scores">, "name" | "cwd">;

function asker(params: Asker): Asker {
  const { caller, actor, actorSpace, actorIsOperator, steal, crossSpace } = params;
  return {
    ...(caller === undefined ? {} : { caller }),
    ...(actor === undefined ? {} : { actor }),
    ...(actorSpace === undefined ? {} : { actorSpace }),
    ...(actorIsOperator === undefined ? {} : { actorIsOperator }),
    ...(steal === undefined ? {} : { steal }),
    ...(crossSpace === undefined ? {} : { crossSpace }),
  };
}

/** What sending one text to a council's members came to. */
type CouncilSent = Pick<ResultOf<"council-round">, "deliveries" | "refused">;

/** What a send to one member came to. */
type MemberSend = { readonly delivery: CouncilSent["deliveries"][number] } | { readonly refusal: CouncilSent["refused"][number] };

/** A member that still runs, with the name it sits under. */
interface SittingMember {
  readonly member: CouncilMember;
  readonly view: AgentView;
}

/** Send to each member on its own, so one member's refusal never hides what reached the others. */
async function sendToEach(members: readonly SittingMember[], send: (sitting: SittingMember) => Promise<{ id: string; ack: CouncilSent["deliveries"][number]["ack"] }>): Promise<CouncilSent> {
  const sent = await Promise.all(members.map(async (sitting): Promise<MemberSend> => {
    const { member } = sitting;
    try {
      const accepted = await send(sitting);
      return { delivery: { member: member.name, key: member.agentId, id: accepted.id, ack: accepted.ack } };
    } catch (error) {
      return { refusal: { member: member.name, reason: errorMessage(error) } };
    }
  }));
  return { deliveries: sent.flatMap((send) => "delivery" in send ? [send.delivery] : []), refused: sent.flatMap((send) => "refusal" in send ? [send.refusal] : []) };
}

/** Where the council a request names keeps its files. */
function directoryOf(state: DaemonState, ref: CouncilRef): string {
  return councilDirectory(ref.cwd, state.services.settingsFor(ref.cwd).settings.council.directory, ref.name);
}

/** The council a request names. One that was never convened from that directory is refused. */
function councilNamed(state: DaemonState, ref: CouncilRef): CouncilRecord {
  const directory = directoryOf(state, ref);
  const council = councilAt(state.directory, directory);
  if (council === undefined) throw new CommandRefusal(`no council named ${ref.name} was convened here: ${directory} belongs to none`);
  return council;
}

/** A council's members that still run, each with the name it sits under. */
function sittingMembers(directory: OrchDir, council: CouncilRecord): SittingMember[] {
  return councilMembersOf(directory, council.id).flatMap((member) => {
    const view = agentView(directory, member.agentId);
    return view?.endedAt === null ? [{ member, view }] : [];
  });
}

/** The members of a council's last round still writing it. */
function stillWriting(reviews: readonly ReviewRecord[], last: number): string[] {
  return reviews.filter((review) => review.round === last && review.scoredAt === null).map((review) => review.member);
}

/** An open council a request names, with its last round and every review. A closed one is refused. */
function openCouncil(state: DaemonState, ref: CouncilRef): { council: CouncilRecord; last: number; reviews: ReviewRecord[] } {
  const council = councilNamed(state, ref);
  if (council.closedAt !== null) throw new CommandRefusal(`council ${council.name} is closed`);
  return { council, last: lastRound(state.directory, council.id), reviews: councilReviewsOf(state.directory, council.id) };
}

/** Why a council takes no next round, or null while it goes on. A round still running has
 *  stopped nothing yet. */
function stoppedBecause(reviews: readonly ReviewRecord[], last: number, stop: CouncilStop): string | null {
  if (stillWriting(reviews, last).length > 0) return null;
  return stopReason(stop, last, roundMeans(reviews));
}

/** Close the members a convene launched before it failed, so a council that was never
 *  recorded leaves no agent behind. */
async function unseat(state: DaemonState, params: ParamsOf<"council-convene">, seated: readonly SpawnedFleet[]): Promise<void> {
  for (const agent of seated.flatMap((fleet) => fleet.agents)) await closeAnywhere(state, { ...asker(params), key: agent.key });
}

/** `council-convene`: launch the members and record the council. The members sit in the
 *  council's tab, and in numbered tabs after it when they outnumber
 *  `fleet.max_agents_per_tab`. A launch that fails closes the members already seated and
 *  records no council. */
export async function conveneCouncil(state: DaemonState, params: ParamsOf<"council-convene">): Promise<ResultOf<"council-convene">> {
  const settings = state.services.settingsFor(params.cwd).settings;
  const { scale } = settings.council;
  const directory = directoryOf(state, params);
  if (councilAt(state.directory, directory) !== undefined) throw new CommandRefusal(`a council named ${params.name} already has ${directory}. Pick another name`);
  const convenedBy = params.actor;
  if (convenedBy === undefined) throw new CommandRefusal("a council names its convener, and this request carried no caller");
  const perTab = settings.fleet.max_agents_per_tab;
  const tabs = memberTabs(params.tab ?? params.name, params.members, perTab);
  const seated: SpawnedFleet[] = [];
  for (const { tab, members } of tabs) {
    let fleet: Awaited<ReturnType<typeof spawnAgents>>;
    try {
      fleet = await spawnAgents(state, {
        ...asker(params),
        form: params.form,
        plexer: params.plexer,
        tab,
        space: params.space,
        cwd: params.cwd,
        host: null,
        worktree: null,
        lane: null,
        agents: members.map((member) => ({ ...member, prompt: null, readOnly: { out: memberDirectory(directory, member.name) } })),
      });
    } catch (error) {
      await unseat(state, params, seated);
      throw error;
    }
    if (fleet.outcome === "answer") {
      await unseat(state, params, seated);
      return fleet;
    }
    seated.push(fleet);
  }
  const notes = seated.flatMap((fleet) => fleet.notes);
  if (tabs.length > 1) notes.push(`Council ${params.name} sits in ${tabs.length} tabs, ${tabs.map(({ tab }) => tab).join(" and ")}: one tab holds ${perTab} agents, the fleet.max_agents_per_tab setting.`);
  const spawned = joinSpawned(seated, notes);
  insertCouncil(
    state.directory,
    { id: randomUUID(), name: params.name, directory, convenedBy, scale, convenedAt: Date.now(), closedAt: null },
    spawned.agents.map((agent) => ({ agentId: agent.key, name: agent.name })),
  );
  return { outcome: "convened", directory, scale, spawned };
}

/** `council-round`: send the next round onto each sitting member's conversation, and record
 *  the review each dispatch asks for. A round waits for the one before it to finish, and a
 *  council takes no round past the stop its `council.stop` setting gives. With
 *  `council.context` fresh, each member's session is cleared before round 2 and later. Who may
 *  send one is the dispatch gate's ruling: whoever may drive the members. */
export async function councilRound(state: DaemonState, params: ParamsOf<"council-round">): Promise<ResultOf<"council-round">> {
  const directory = state.directory;
  const { council, last, reviews } = openCouncil(state, params);
  const running = stillWriting(reviews, last);
  if (running.length > 0) throw new CommandRefusal(`round ${last} of council ${council.name} is still running. Not finished: ${running.join(", ")}`);
  const settings = state.services.settingsFor(params.cwd).settings;
  const stop = councilStop(settings.council);
  const stopped = stoppedBecause(reviews, last, stop);
  if (stopped !== null) throw new CommandRefusal(`council ${council.name} ${stopped}`);
  const { context } = settings.council;
  const sitting = sittingMembers(directory, council);
  if (sitting.length === 0) throw new CommandRefusal(`council ${council.name} has no member still running`);
  const round = last + 1;
  if (params.caller === undefined) throw new CommandRefusal("a council's round names its convener, and this request carried no caller");
  const self = callerSelf(directory, { caller: params.caller });
  const { deliveries, refused } = await sendToEach(sitting, async ({ member, view }) => {
    if (context === "fresh" && round > 1) await clearSession(state, { ...asker(params), target: member.agentId });
    const text = memberPrompt({
      context,
      council: council.directory,
      member: member.name,
      others: sitting.map((other) => other.member.name).filter((name) => name !== member.name),
      round,
      scale: council.scale,
      subject: params.subject,
    });
    const worker = { harness: isAdapterId(view.harnessId) ? view.harnessId : null, context: workerHeaderContextOf(self, settings, view) };
    const accepted = await dispatch(state, { ...asker(params), target: member.agentId, text, worker });
    askReview(directory, { dispatchId: accepted.id, councilId: council.id, round, member: member.name, askedAt: Date.now() });
    return accepted;
  });
  if (deliveries.length === 0) throw new CommandRefusal(`round ${round} of council ${council.name} reached no member. ${refused.map((refusal) => `${refusal.member}: ${refusal.reason}`).join(". ")}`);
  return { round, stop, deliveries, refused };
}

/** `council-steer`: one instruction to every member still writing the current round. A member
 *  that finished the round is named and not steered: the next round's text is where it hears
 *  it. Who may steer is the steer verb's ruling. */
export async function councilSteer(state: DaemonState, params: ParamsOf<"council-steer">): Promise<ResultOf<"council-steer">> {
  const { council, last: round, reviews } = openCouncil(state, params);
  const writing = new Set(stillWriting(reviews, round));
  const sitting = sittingMembers(state.directory, council);
  const finished = sitting.filter(({ member }) => !writing.has(member.name)).map(({ member }) => member.name);
  const targets = sitting.filter(({ member }) => writing.has(member.name));
  if (targets.length === 0) throw new CommandRefusal(`no member of council ${council.name} is still writing round ${round}. Say it in the text of the next round`);
  const sent = await sendToEach(targets, ({ member }) => steer(state, { ...asker(params), target: member.agentId, text: params.text }));
  return { round, ...sent, finished };
}

/** `council-scores`: every review of a council, with the model and cost of the run behind each. */
export function councilScores(state: DaemonState, params: ParamsOf<"council-scores">): ResultOf<"council-scores"> {
  const directory = state.directory;
  const council = councilNamed(state, params);
  const records = councilReviewsOf(directory, council.id);
  const reviews = records.map((review) => {
    const run = selectRun(directory, review.dispatchId);
    return { round: review.round, member: review.member, score: review.score, problem: review.problem, scoredAt: review.scoredAt, model: run?.model ?? null, cost: run?.cost ?? null };
  });
  const stop = councilStop(state.services.settingsFor(params.cwd).settings.council);
  const stopped = stoppedBecause(records, lastRound(directory, council.id), stop);
  return { name: council.name, directory: council.directory, scale: council.scale, stop, stopped, closedAt: council.closedAt, members: councilMembersOf(directory, council.id).map((member) => member.name), reviews };
}

/** `council-close`: close every member still running, then the council. Who may close a member
 *  is the close verb's ruling. */
export async function closeCouncilNamed(state: DaemonState, params: ParamsOf<"council-close">): Promise<ResultOf<"council-close">> {
  const council = councilNamed(state, params);
  const sitting = sittingMembers(state.directory, council);
  for (const { member } of sitting) await closeAnywhere(state, { ...asker(params), key: member.agentId });
  closeCouncil(state.directory, council.id, Date.now());
  state.wake.wake();
  return { closed: sitting.map(({ member }) => member.name) };
}

/** What a finished member's round file comes to. The file is on the host the member runs on. */
function reviewOutcome(directory: OrchDir, agentId: string, review: ReviewRecord, council: CouncilRecord): ReviewOutcome {
  if (hereAgentIfAny(directory, agentId) === null) return { problem: "the member does not run on this host, so its round file cannot be read here" };
  const file = roundFilePath(council.directory, review.member, review.round);
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return { problem: `the member wrote no ${file}` };
  }
  const parsed = parseRoundFile(text, council.scale);
  return parsed.ok ? { score: parsed.review.score } : { problem: parsed.problem };
}

/** Score the review a finished run was asked for. A run that is no council round, or one still
 *  going, is left alone. The score goes to the store and to the member's history. */
export function scoreFinishedRun(directory: OrchDir, run: RunRecord, now = Date.now()): void {
  if (run.state !== "done" && run.finishedAt === undefined) return;
  const waiting = waitingReview(directory, run.dispatchId);
  if (waiting === undefined) return;
  const { review, council } = waiting;
  const outcome = run.state === "done" ? reviewOutcome(directory, run.agentKey, review, council) : { problem: `the member's run ended ${run.state}` };
  scoreReview(directory, run.dispatchId, now, outcome);
  appendScore(run.agentKey, directory, { ts: now, key: run.agentKey, dispatchId: run.dispatchId, council: council.name, round: review.round, member: review.member, ...outcome });
}
