// The council: agents on different models that review one subject and score it, round by
// round. orchd convenes one, sends each round, scores a member's round file when its run
// finishes, and closes it. Every member is a read-only agent whose output directory is its own
// directory under the council's.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { councilDirectory, memberDirectory, roundFilePath } from "../../council/layout.ts";
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
import { callerSelf } from "./handlers/self.ts";
import { dispatch } from "./handlers/write.ts";
import { spawnAgents } from "./spawn/index.ts";
import type { ParamsOf, ResultOf } from "../client/protocol.ts";
import type { DaemonState } from "./state.ts";
import type { OrchDir } from "../../types/core.ts";
import type { CouncilMember, CouncilRecord, ReviewOutcome, ReviewRecord } from "../../types/council.ts";
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

type RoundResult = ResultOf<"council-round">;

/** What sending a round to one member came to. */
type RoundSend = { readonly delivery: RoundResult["deliveries"][number] } | { readonly refusal: RoundResult["refused"][number] };

/** Where the council a request names keeps its files. */
function directoryOf(state: DaemonState, ref: CouncilRef): string {
  return councilDirectory(ref.cwd, state.services.settings.current().council.directory, ref.name);
}

/** The council a request names. One that was never convened from that directory is refused. */
function councilNamed(state: DaemonState, ref: CouncilRef): CouncilRecord {
  const directory = directoryOf(state, ref);
  const council = councilAt(state.directory, directory);
  if (council === undefined) throw new CommandRefusal(`no council named ${ref.name} was convened here: ${directory} belongs to none`);
  return council;
}

/** A council's members that still run, each with the name it sits under. */
function sittingMembers(directory: OrchDir, council: CouncilRecord): { readonly member: CouncilMember; readonly view: AgentView }[] {
  return councilMembersOf(directory, council.id).flatMap((member) => {
    const view = agentView(directory, member.agentId);
    return view?.endedAt === null ? [{ member, view }] : [];
  });
}

/** `council-convene`: launch the members and record the council. A launch that placed nothing
 *  answers as a spawn does, and records no council. */
export async function conveneCouncil(state: DaemonState, params: ParamsOf<"council-convene">): Promise<ResultOf<"council-convene">> {
  const { scale } = state.services.settings.current().council;
  const directory = directoryOf(state, params);
  if (councilAt(state.directory, directory) !== undefined) throw new CommandRefusal(`a council named ${params.name} already has ${directory}. Pick another name`);
  const convenedBy = params.actor;
  if (convenedBy === undefined) throw new CommandRefusal("a council names its convener, and this request carried no caller");
  const spawned = await spawnAgents(state, {
    ...asker(params),
    form: params.form,
    plexer: params.plexer,
    tab: params.tab ?? params.name,
    space: params.space,
    cwd: params.cwd,
    cmd: null,
    host: null,
    worktree: null,
    agents: params.members.map((member) => ({ ...member, prompt: null, readOnly: { out: memberDirectory(directory, member.name) } })),
  });
  if (spawned.outcome === "answer") return spawned;
  insertCouncil(
    state.directory,
    { id: randomUUID(), name: params.name, directory, convenedBy, scale, convenedAt: Date.now(), closedAt: null },
    spawned.agents.map((agent) => ({ agentId: agent.key, name: agent.name })),
  );
  return { outcome: "convened", directory, scale, spawned };
}

/** `council-round`: send the next round onto each sitting member's conversation, and record
 *  the review each dispatch asks for. A round waits for the one before it to finish. Who may
 *  send one is the dispatch gate's ruling: whoever may drive the members. */
export async function councilRound(state: DaemonState, params: ParamsOf<"council-round">): Promise<ResultOf<"council-round">> {
  const directory = state.directory;
  const council = councilNamed(state, params);
  if (council.closedAt !== null) throw new CommandRefusal(`council ${council.name} is closed`);
  const last = lastRound(directory, council.id);
  const running = councilReviewsOf(directory, council.id).filter((review) => review.round === last && review.scoredAt === null).map((review) => review.member);
  if (running.length > 0) throw new CommandRefusal(`round ${last} of council ${council.name} is still running. Not finished: ${running.join(", ")}`);
  const sitting = sittingMembers(directory, council);
  if (sitting.length === 0) throw new CommandRefusal(`council ${council.name} has no member still running`);
  const round = last + 1;
  if (params.caller === undefined) throw new CommandRefusal("a council's round names its convener, and this request carried no caller");
  const self = callerSelf(directory, { caller: params.caller });
  const settings = state.services.settings.current();
  // One member's refusal never hides what reached the others: each send answers for itself.
  const sent = await Promise.all(sitting.map(async ({ member, view }): Promise<RoundSend> => {
    const text = memberPrompt({
      council: council.directory,
      member: member.name,
      others: sitting.map((other) => other.member.name).filter((name) => name !== member.name),
      round,
      scale: council.scale,
      subject: params.subject,
    });
    const worker = { harness: isAdapterId(view.harnessId) ? view.harnessId : null, context: workerHeaderContextOf(self, settings, view) };
    try {
      const accepted = await dispatch(state, { ...asker(params), target: member.agentId, text, worker });
      askReview(directory, { dispatchId: accepted.id, councilId: council.id, round, member: member.name, askedAt: Date.now() });
      return { delivery: { member: member.name, key: member.agentId, id: accepted.id, ack: accepted.ack } };
    } catch (error) {
      return { refusal: { member: member.name, reason: errorMessage(error) } };
    }
  }));
  const deliveries = sent.flatMap((send) => "delivery" in send ? [send.delivery] : []);
  const refused = sent.flatMap((send) => "refusal" in send ? [send.refusal] : []);
  if (deliveries.length === 0) throw new CommandRefusal(`round ${round} of council ${council.name} reached no member. ${refused.map((refusal) => `${refusal.member}: ${refusal.reason}`).join(". ")}`);
  return { round, deliveries, refused };
}

/** `council-scores`: every review of a council, with the model and cost of the run behind each. */
export function councilScores(state: DaemonState, params: ParamsOf<"council-scores">): ResultOf<"council-scores"> {
  const directory = state.directory;
  const council = councilNamed(state, params);
  const reviews = councilReviewsOf(directory, council.id).map((review) => {
    const run = selectRun(directory, review.dispatchId);
    return { round: review.round, member: review.member, score: review.score, problem: review.problem, scoredAt: review.scoredAt, model: run?.model ?? null, cost: run?.cost ?? null };
  });
  return { name: council.name, directory: council.directory, scale: council.scale, closedAt: council.closedAt, members: councilMembersOf(directory, council.id).map((member) => member.name), reviews };
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
