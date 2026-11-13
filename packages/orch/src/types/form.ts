/** The stdio a harness process is started on. */
export const STDIO_KINDS = ["terminal", "pipes", "none"] as const;
export type StdioKind = (typeof STDIO_KINDS)[number];

/** One way a harness runs. `tui` is its interactive terminal program, `oneshot` runs one
 *  prompt and exits, `acp` speaks the Agent Client Protocol over its stdio, and `server` runs
 *  the harness's own server, which orchd drives over that server's API. */
export const FORM_IDS = ["tui", "oneshot", "acp", "server"] as const;
export type FormId = (typeof FORM_IDS)[number];

/** Who holds each form's session: that side writes the transcript and reports the agent's
 *  state. An agent in an `orchd` form ignores its harness's reports. */
export const FORM_SESSION_OWNER: Readonly<Record<FormId, "harness" | "orchd">> = { tui: "harness", oneshot: "harness", acp: "orchd", server: "orchd" };

export function isFormId(value: string): value is FormId {
  return FORM_IDS.some((id) => id === value);
}

/** The stdio each form needs from the backend that holds its process. A backend states what it
 *  offers, and that match is the only thing that joins a form to a backend. */
export const FORM_STDIO: Readonly<Record<FormId, StdioKind>> = { tui: "terminal", oneshot: "none", acp: "pipes", server: "pipes" };

/** The form a backend runs when a spawn names none: the one whose stdio the backend offers
 *  first. Null when the backend offers nothing a form needs. */
export function nativeForm(offers: readonly StdioKind[]): FormId | null {
  for (const stdio of offers) {
    const form = FORM_IDS.find((id) => FORM_STDIO[id] === stdio);
    if (form !== undefined) return form;
  }
  return null;
}

/** Whether a backend offering `offers` can hold a process in `form`. */
export function offersForm(offers: readonly StdioKind[], form: FormId): boolean {
  return offers.includes(FORM_STDIO[form]);
}
