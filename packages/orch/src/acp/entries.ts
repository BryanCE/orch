import type { SessionUpdate, StopReason, ToolCallUpdate } from "@agentclientprotocol/sdk";
import type { SessionViewEntry } from "../types/adapter.ts";
import type { TurnOutcome } from "../types/held-session.ts";

/** Turns session updates into entries, joining consecutive chunks of one message. */
export interface AcpEntryBuilder {
  push(update: SessionUpdate): SessionViewEntry[];
  flush(): SessionViewEntry[];
}

/** Builds normalized transcript entries without exposing protocol details. */
export function acpEntryBuilder(): AcpEntryBuilder {
  let pending: { role: "assistant" | "user"; text: string; messageId: string | null } | null = null;
  const tools = new Map<string, { name: string } & Pick<ToolCallUpdate, "content" | "rawOutput">>();
  function flush(): SessionViewEntry[] {
    if (pending === null) return [];
    const { role, text } = pending;
    pending = null;
    return [{ role, text }];
  }
  return {
    flush,
    push(update) {
      if (update.sessionUpdate === "agent_message_chunk" || update.sessionUpdate === "user_message_chunk") {
        const role = update.sessionUpdate === "agent_message_chunk" ? "assistant" : "user";
        const messageId = update.messageId ?? null;
        const entries = pending !== null && (pending.role !== role || pending.messageId !== messageId) ? flush() : [];
        if (update.content.type === "text") {
          if (pending === null) pending = { role, text: update.content.text, messageId };
          else pending.text += update.content.text;
        }
        return entries;
      }
      const entries = flush();
      switch (update.sessionUpdate) {
        case "tool_call": {
          const name = update.name ?? update.title;
          tools.set(update.toolCallId, { name, content: update.content, rawOutput: update.rawOutput });
          entries.push({ role: "assistant", toolCalls: [{ name, arg: typeof update.rawInput === "string" ? update.rawInput : JSON.stringify(update.rawInput) ?? "" }] });
          break;
        }
        case "tool_call_update": {
          const tool = tools.get(update.toolCallId) ?? { name: update.title ?? update.toolCallId, content: undefined, rawOutput: undefined };
          if (update.name != null) tool.name = update.name;
          if (update.content !== undefined) tool.content = update.content;
          if ("rawOutput" in update) tool.rawOutput = update.rawOutput;
          tools.set(update.toolCallId, tool);
          if (update.status !== "completed" && update.status !== "failed") break;
          const text = tool.content?.flatMap((item) => item.type === "content" && item.content.type === "text" ? [item.content.text] : []) ?? [];
          entries.push({
            role: "tool",
            tool: tool.name,
            text: text.length > 0 ? text.join("\n") : (typeof tool.rawOutput === "string" ? tool.rawOutput : JSON.stringify(tool.rawOutput) ?? ""),
            isError: update.status === "failed",
          });
          tools.delete(update.toolCallId);
          break;
        }
        case "plan":
          entries.push({ role: "assistant", text: update.entries.map((item) => `${item.status} ${item.content}`).join("\n") });
          break;
        case "agent_thought_chunk":
        case "available_commands_update":
        case "current_mode_update":
        case "config_option_update":
        case "session_info_update":
        case "usage_update":
        case "notice":
        case "compaction_update":
        case "compaction_summary_chunk":
          break;
        default: {
          const exhaustive: never = update;
          return exhaustive;
        }
      }
      return entries;
    },
  };
}

/** Maps every protocol stop reason to a presence outcome. */
export function outcomeOf(stop: StopReason): TurnOutcome {
  switch (stop) {
    case "end_turn": return { state: "done", error: null };
    case "cancelled": return { state: "aborted", error: null };
    case "refusal":
    case "max_tokens":
    case "max_turn_requests": return { state: "error", error: stop };
    default: {
      const exhaustive: never = stop;
      return exhaustive;
    }
  }
}
