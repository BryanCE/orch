// Claude's own names for its built-in tools. The hook and claude's adapter both read them
// here, so neither keeps a second list.
import type { ToolVocabulary } from "orch/core/policy/write-root.ts";

/** Claude's built-in tools a write-root agent keeps: three that read, and `Edit` and `Write`, which change the file at `file_path`. */
export const CLAUDE_TOOLS: ToolVocabulary = { reads: ["Read", "Grep", "Glob"], writes: ["Edit", "Write"], pathField: "file_path" };
