// `orch council`: convene agents on different models to review one subject, send each round,
// read the scores, and close it. The CLI parses and reports; orchd launches the members, sends
// the rounds and scores each review.
import { usageError } from "../cli/usage.ts";
import { installManagerOf } from "../settings/manager.ts";
import { projectSettings } from "../settings/project.ts";
import { roundMean, stopRule } from "../council/stop.ts";
import { councilLineup } from "../council/lineup.ts";
import { renderTable } from "../table.ts";
import { taskWithReferences } from "../worker-prompt.ts";
import { readRpc, writeRpc } from "./daemon.ts";
import { writeDelivery } from "./delivery.ts";
import { contextReference } from "./prompt-file.ts";
import { parseCommand } from "./registry.ts";
import { formatCost } from "./runs.ts";
import { resolveSpawnSettings, spawnFlagsOf, type SpawnFlags } from "./spawn/flags.ts";
import { answerNoEnvironmentRole, launchBudgetMs, reportSpawned } from "./spawn/index.ts";
import type { Invocation } from "../cli/spec.ts";
import type { ParamsOf, ResultOf } from "../daemon/client/protocol.ts";
import type { Services } from "../types/services.ts";
import type { OrchSettings } from "../types/settings.ts";

type CouncilScores = ResultOf<"council-scores">;
type CouncilReview = CouncilScores["reviews"][number];

/** The directory a council is named from: `--dir`, or this one. */
function councilCwd(invocation: Invocation): string {
  return invocation.flags.value("--dir") ?? process.cwd();
}

/** What the members are told for a round: the convener's text, with where `--with` points. */
function subjectOf(invocation: Invocation, text: string): string {
  return taskWithReferences(text, invocation.flags.values("--with").map(contextReference));
}

/** Send a round and report each member's delivery. */
async function sendRound(services: Services, params: Pick<ParamsOf<"council-round">, "name" | "cwd" | "subject">, json: boolean): Promise<void> {
  const sent = await writeRpc(services, "council-round", params);
  if (json) {
    process.stdout.write(JSON.stringify(sent) + "\n");
    return;
  }
  for (const delivery of sent.deliveries) writeDelivery({ target: delivery.key, name: delivery.member, action: "dispatch", id: delivery.id, ack: delivery.ack }, { json: false });
  process.stdout.write(`Round ${sent.round} of council ${params.name} went to ${sent.deliveries.length} of its members. The council stops ${stopRule(sent.stop)}.\n`);
  for (const refusal of sent.refused) process.stdout.write(`Round ${sent.round} did not reach ${refusal.member}: ${refusal.reason}\n`);
}

/** Who sits on the council: the members the convener named, each on the model its flags give,
 *  or the lineup `council.models` holds when it named none. */
function membersOf(flags: SpawnFlags, council: string, named: readonly string[], settings: OrchSettings): Pick<SpawnFlags, "positional" | "modelFlags" | "harnessFlags"> {
  if (named.length > 0) return { positional: [...named], modelFlags: flags.modelFlags, harnessFlags: flags.harnessFlags };
  if (flags.modelFlags.length > 0 || flags.harnessFlags.length > 0) throw usageError(flags.at, "--model and --harness go with named members; name them, or drop the flag to convene the council.models lineup");
  const lineup = councilLineup(council, settings.council.models);
  if (lineup.length === 0) throw usageError(flags.at, "no member to convene: the council.models setting is empty. Set it with orch settings council.models, or name the members");
  return { positional: lineup.map((member) => member.name), modelFlags: lineup.map((member) => member.model), harnessFlags: lineup.map((member) => member.harness) };
}

async function convene(services: Services, invocation: Invocation): Promise<void> {
  const [name, ...named] = invocation.positional;
  const prompt = invocation.flags.value("--prompt");
  if (name === undefined) throw usageError(invocation);
  if (prompt === undefined) throw usageError(invocation, "a council reviews a subject; say what it is with --prompt");
  // The lineup, its allowlist and the launch read the council's directory's project settings.
  const install = installManagerOf(services.settings);
  const project = projectSettings(councilCwd(invocation), install);
  const settings = project.settings;
  const flags = spawnFlagsOf(invocation);
  // The members launch as a spawn's agents do, so the same flags resolve them. The subject is
  // the round's, never a launch prompt: orchd sends it once every member is recorded.
  const request = resolveSpawnSettings({ ...flags, ...membersOf(flags, name, named, settings), promptFlags: [], withPaths: [] }, settings);
  const subject = subjectOf(invocation, prompt);
  const { cwd, form, plexer, tab, space, agents } = request.params;
  const convened = await writeRpc(services, "council-convene", {
    name, cwd, form, plexer, tab, space,
    members: agents.map((agent) => ({ name: agent.name, harness: agent.harness, model: agent.model, thinking: agent.thinking })),
  }, {}, launchBudgetMs(settings, agents.length, false));
  if (convened.outcome === "answer") return answerNoEnvironmentRole(request.json, convened.text);
  await reportSpawned(services, request, convened.spawned);
  await sendRound(services, { name, cwd, subject }, request.json);
}

async function round(services: Services, invocation: Invocation): Promise<void> {
  const [name, ...words] = invocation.positional;
  if (name === undefined || words.length === 0) throw usageError(invocation);
  await sendRound(services, { name, cwd: councilCwd(invocation), subject: subjectOf(invocation, words.join(" ")) }, invocation.flags.has("--json"));
}

/** `orch council steer`: one instruction to every member still writing the current round. */
async function steer(services: Services, invocation: Invocation): Promise<void> {
  const [name, ...words] = invocation.positional;
  if (name === undefined || words.length === 0) throw usageError(invocation);
  const sent = await writeRpc(services, "council-steer", { name, cwd: councilCwd(invocation), text: words.join(" ") });
  if (invocation.flags.has("--json")) {
    process.stdout.write(JSON.stringify(sent) + "\n");
    return;
  }
  for (const delivery of sent.deliveries) writeDelivery({ target: delivery.key, name: delivery.member, action: "steer", id: delivery.id, ack: delivery.ack }, { json: false });
  for (const refusal of sent.refused) process.stdout.write(`The steer did not reach ${refusal.member}: ${refusal.reason}\n`);
  if (sent.finished.length > 0) process.stdout.write(`Finished round ${sent.round} already, so not steered: ${sent.finished.join(", ")}. Say it to them in the text of the next round.\n`);
}

/** One review as a table cell: its score, `running` until its run finishes, `?` when its file carried none. */
function scoreCell(review: CouncilReview | undefined): string {
  if (review === undefined) return "-";
  if (review.score !== null) return String(review.score);
  return review.scoredAt === null ? "running" : "?";
}

/** The mean of a round's scores to one decimal, or a dash when it has none yet. */
function meanCell(reviews: readonly CouncilReview[]): string {
  return roundMean(reviews)?.toFixed(1) ?? "-";
}

function totalCost(reviews: readonly CouncilReview[]): string {
  const costs = reviews.flatMap((review) => review.cost === null ? [] : [review.cost]);
  return formatCost(costs.length === 0 ? undefined : costs.reduce((sum, cost) => sum + cost, 0));
}

/** A council's scores: a row per member, a column per round, and under the table what was
 *  wrong with each round file that carried no score. */
export function renderScores(scores: CouncilScores): string {
  const rounds = [...new Set(scores.reviews.map((review) => review.round))].sort((a, b) => a - b);
  const state = scores.closedAt === null ? "open" : "closed";
  const title = `Council ${scores.name}, ${state}. ${rounds.length} rounds run. It stops ${stopRule(scores.stop)}. Scores are out of ${scores.scale}.`;
  if (rounds.length === 0) return title;
  const stopped = scores.stopped === null ? [] : [`Council ${scores.name} ${scores.stopped}.`];
  const rows = scores.members.map((member) => {
    const own = scores.reviews.filter((review) => review.member === member);
    const models = own.flatMap((review) => review.model === null ? [] : [review.model]);
    return [member, models[models.length - 1] ?? "-", ...rounds.map((number) => scoreCell(own.find((review) => review.round === number))), totalCost(own)];
  });
  const mean = ["mean", "", ...rounds.map((number) => meanCell(scores.reviews.filter((review) => review.round === number))), totalCost(scores.reviews)];
  const table = renderTable(["MEMBER", "MODEL", ...rounds.map((number) => `R${number}`), "COST"], [...rows, mean], [30, 40, ...rounds.map(() => 8), 10]);
  const problems = scores.reviews.flatMap((review) => review.problem === null ? [] : [`Round ${review.round}, ${review.member}: ${review.problem}.`]);
  return [title, table, ...problems, ...stopped].join("\n");
}

async function scores(services: Services, invocation: Invocation): Promise<void> {
  const [name] = invocation.positional;
  if (name === undefined || invocation.positional.length > 1) throw usageError(invocation);
  const result = await readRpc(services, "council-scores", { name, cwd: councilCwd(invocation) });
  process.stdout.write((invocation.flags.has("--json") ? JSON.stringify(result, null, 2) : renderScores(result)) + "\n");
}

async function close(services: Services, invocation: Invocation): Promise<void> {
  const [name] = invocation.positional;
  if (name === undefined || invocation.positional.length > 1) throw usageError(invocation);
  const { closed } = await writeRpc(services, "council-close", { name, cwd: councilCwd(invocation) });
  if (invocation.flags.has("--json")) {
    process.stdout.write(JSON.stringify({ council: name, closed }) + "\n");
    return;
  }
  process.stdout.write(closed.length === 0 ? `Closed council ${name}. No member was still running.\n` : `Closed council ${name} and its members: ${closed.join(", ")}.\n`);
}

/** `orch council <convene|round|scores|close>`. */
export async function cmdCouncil(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("council", args);
  switch (invocation.command.name) {
    case "convene": return convene(services, invocation);
    case "round": return round(services, invocation);
    case "steer": return steer(services, invocation);
    case "scores": return scores(services, invocation);
    case "close": return close(services, invocation);
    default: throw usageError(invocation);
  }
}
