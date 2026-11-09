// Reading one field of a harness's session view, shared by the reader in orchd and the CLI that prints it.
import type { SessionView } from "./types/adapter.ts";

/** One field of a session view, or null when the view or the field is absent. */
export function sessionViewValue(view: SessionView | null | undefined, key: keyof SessionView): unknown {
  return view?.[key] ?? null;
}
