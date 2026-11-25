// A plan file as queue tasks: each `## ` heading starts one task, and the text above the first
// heading starts every task. A `## ` line inside a code fence is task text, not a heading.

const FENCE = /^\s*(```|~~~)/;
const HEADING = "## ";

/** The task texts a plan file holds, in file order. Empty when it has no `## ` section. */
export function planSections(body: string): string[] {
  const preamble: string[] = [];
  const sections: string[][] = [];
  let fenced = false;
  for (const line of body.split(/\r?\n/)) {
    if (FENCE.test(line)) fenced = !fenced;
    if (!fenced && line.startsWith(HEADING)) sections.push([]);
    (sections.at(-1) ?? preamble).push(line);
  }
  const lead = preamble.join("\n").trim();
  return sections.map((lines) => {
    const section = lines.join("\n").trim();
    return lead === "" ? section : `${lead}\n\n${section}`;
  });
}
