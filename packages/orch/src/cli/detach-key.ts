// The key that detaches `orch attach` from an agent's screen. It is a control chord, so it is one
// byte in a raw terminal: the setting names it, and the viewer looks for that byte in what the
// keyboard sends. Everything else passes through to the agent.

/** A control chord as the `attach.detach_key` setting spells it: `ctrl-` and one character. */
export const DETACH_KEY_PATTERN = /^ctrl-[a-z@[\\\]^_]$/i;

/** The byte a raw terminal sends for a control chord. */
export function detachByte(chord: string): number {
  if (!DETACH_KEY_PATTERN.test(chord)) throw new Error(`a detach key is ctrl- and one of a-z @ [ \\ ] ^ _, not ${JSON.stringify(chord)}`);
  return chord.slice("ctrl-".length).toUpperCase().charCodeAt(0) & 0x1f;
}

/** One read from the keyboard, split at the detach key: what goes to the agent, and whether the
 *  viewer detaches after sending it. Nothing typed after the detach key is sent. */
export function splitAtDetach(chunk: Uint8Array, detach: number): { readonly forward: Uint8Array; readonly detached: boolean } {
  const at = chunk.indexOf(detach);
  return at < 0 ? { forward: chunk, detached: false } : { forward: chunk.subarray(0, at), detached: true };
}
