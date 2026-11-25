/** A council as the store holds it. */
export interface CouncilRecord {
  readonly id: string;
  readonly name: string;
  /** The council's own directory, absolute. A member's directory is the one under it named for the member. */
  readonly directory: string;
  /** The agent that convened it. */
  readonly convenedBy: string;
  /** Every score is a whole number from 0 to this. */
  readonly scale: number;
  readonly convenedAt: number;
  /** Null while the council is open. */
  readonly closedAt: number | null;
}

/** An agent that sits on a council, under the name it was convened with. */
export interface CouncilMember {
  readonly agentId: string;
  readonly name: string;
}

/** One member's review of one round, asked for by one dispatch. */
export interface ReviewRecord {
  readonly dispatchId: string;
  readonly councilId: string;
  readonly round: number;
  /** The member's name when the round was asked for. */
  readonly member: string;
  readonly askedAt: number;
  /** Null until the run finishes, and when the round file carries no score. */
  readonly score: number | null;
  /** What is wrong with the round file, when orch could read no score from it. */
  readonly problem: string | null;
  /** Null until the run finishes. */
  readonly scoredAt: number | null;
}

/** What a finished review came to: the score its round file carries, or what is wrong with the file. */
export type ReviewOutcome = { readonly score: number } | { readonly problem: string };

/** How a council stops: the `council.stop` setting. */
export const COUNCIL_STOPS = ["rounds", "score"] as const;
export type CouncilStopMode = (typeof COUNCIL_STOPS)[number];

/** Whether a member keeps its conversation between rounds: the `council.context` setting. */
export const COUNCIL_CONTEXTS = ["keep", "fresh"] as const;
export type CouncilContext = (typeof COUNCIL_CONTEXTS)[number];

/** When a council stops taking rounds: after a count of rounds, or once a round's mean reaches
 *  a target score or stops rising for more rounds in a row than `patience`. */
export type CouncilStop =
  | { readonly stop: "rounds"; readonly rounds: number }
  | { readonly stop: "score"; readonly targetScore: number; readonly patience: number };
