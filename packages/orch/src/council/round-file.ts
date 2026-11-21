// A council member writes one file per round. This module is the one place that knows the
// file's name and layout: the member's prompt quotes `roundFileLayout`, and orchd reads the
// file back with `parseRoundFile` when the member's run finishes.

/** What a member's round file says. */
export interface RoundReview {
  /** The member's score: a whole number from 0 to the council's scale. */
  readonly score: number;
  /** What would improve the subject, the most important first. */
  readonly improvements: readonly string[];
}

/** A round file read back: the review, or what is wrong with the file. */
export type RoundFileParse =
  | { readonly ok: true; readonly review: RoundReview }
  | { readonly ok: false; readonly problem: string };

/** The name of a member's file for one round, inside the member's directory. */
export function roundFileName(round: number): string {
  return `round-${round}.md`;
}

/** The layout a member is told to write, for a council that scores out of `scale`. */
export function roundFileLayout(scale: number): string {
  return `Score: <a whole number from 0 to ${scale}>/${scale}\n\n## Improvements\n\n1. <the change that would raise the score most>\n2. <the next one>`;
}

const SCORE_LINE = /^Score:\s*(\d+)\s*\/\s*(\d+)$/;

/** Read a round file's text back, for a council that scores out of `scale`. */
export function parseRoundFile(text: string, scale: number): RoundFileParse {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  const match = lines.map((line) => SCORE_LINE.exec(line)).find((found) => found !== null);
  if (match === undefined || match === null) {
    return { ok: false, problem: `the file has no \`Score: <n>/${scale}\` line` };
  }
  const score = Number(match[1]);
  const denominator = Number(match[2]);
  if (denominator !== scale) {
    return { ok: false, problem: `the score is out of ${denominator}, and this council scores out of ${scale}` };
  }
  if (score > scale) {
    return { ok: false, problem: `the score ${score} is above ${scale}` };
  }

  const heading = lines.indexOf("## Improvements");
  if (heading === -1) {
    return { ok: false, problem: "the file has no `## Improvements` heading" };
  }
  const improvements: string[] = [];
  for (const line of lines.slice(heading + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    const item = /^\d+\.\s+(.*)$/.exec(line)?.[1];
    if (item !== undefined) improvements.push(item);
    else if (improvements.length > 0 && line.trim() !== "") improvements.push(`${improvements.pop() ?? ""} ${line.trim()}`);
  }
  return { ok: true, review: { score, improvements } };
}
