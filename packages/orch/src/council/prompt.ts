// What a council member is told each round. The layout it is told to write is the one
// `parseRoundFile` reads, because both come from `round-file.ts`.
import { roundFilePath } from "./layout.ts";
import { roundFileLayout } from "./round-file.ts";

/** One member's round, as its prompt needs it. */
export interface MemberRound {
  /** The council's own directory. */
  readonly council: string;
  readonly member: string;
  /** The other members' names. */
  readonly others: readonly string[];
  /** The round's number, from 1. */
  readonly round: number;
  /** Scores run from 0 to this. */
  readonly scale: number;
  /** What the convener wrote for this round: the subject, and from round 2 what changed. */
  readonly subject: string;
}

/** What opens a member's first round: what a council is and what the member does on it. */
function opening(round: MemberRound): string {
  if (round.round === 1) {
    return "You sit on a council that reviews one subject. Review the subject and score it." +
      " You never change the subject: the agent that convened the council does that between rounds.";
  }
  return `Round ${round.round} of the council. The subject changed after round ${round.round - 1}. Read it again and score it as it is now.`;
}

/** Where the other members' reviews of the round before are, from round 2. */
function othersClause(round: MemberRound): string {
  if (round.round === 1 || round.others.length === 0) return "";
  const files = round.others.map((other) => `- ${roundFilePath(round.council, other, round.round - 1)}`).join("\n");
  return `\n\nThe other members' reviews from round ${round.round - 1}. Read them, then judge for yourself: say where you agree and where you do not.\n${files}`;
}

/** The prompt for one member's round. */
export function memberPrompt(round: MemberRound): string {
  const { scale } = round;
  return `${opening(round)}\n\n${round.subject}${othersClause(round)}\n\n` +
    `Write your review to ${roundFilePath(round.council, round.member, round.round)} in exactly this layout:\n\n` +
    `${roundFileLayout(scale)}\n\n` +
    `Score the subject as it is now. ${scale} means you would change nothing.` +
    " List only changes that would raise your score, the most important first, each specific enough to act on." +
    " Reply with your score once the file is written.";
}
