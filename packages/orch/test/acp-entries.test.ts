import { describe, expect, test } from "bun:test";
import { acpEntryBuilder, outcomeOf } from "../src/acp/entries.ts";

describe("ACP entries", () => {
  test("joins message chunks before a tool call", () => {
    const builder = acpEntryBuilder();
    for (const text of ["one", " two", " three"]) {
      expect(builder.push({ sessionUpdate: "agent_message_chunk", content: { type: "text", text } })).toEqual([]);
    }
    expect(builder.push({ sessionUpdate: "tool_call", toolCallId: "call", title: "Read", rawInput: { path: "file" } })).toEqual([
      { role: "assistant", text: "one two three" },
      { role: "assistant", toolCalls: [{ name: "Read", arg: '{"path":"file"}' }] },
    ]);
    expect(builder.flush()).toEqual([]);
  });

  test("flush emits the pending message only once", () => {
    const builder = acpEntryBuilder();
    builder.push({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "hello" } });
    expect(builder.flush()).toEqual([{ role: "assistant", text: "hello" }]);
    expect(builder.flush()).toEqual([]);
  });

  test("thoughts separate messages without emitting an entry", () => {
    const builder = acpEntryBuilder();
    const entries = [
      ...builder.push({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "before" } }),
      ...builder.push({ sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "hidden" } }),
      ...builder.push({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "after" } }),
      ...builder.flush(),
    ];
    expect(entries).toEqual([{ role: "assistant", text: "before" }, { role: "assistant", text: "after" }]);
  });

  test("plan items become status and content lines in one assistant message", () => {
    expect(acpEntryBuilder().push({ sessionUpdate: "plan", entries: [
      { status: "completed", content: "Read files", priority: "high" },
      { status: "in_progress", content: "Write tests", priority: "medium" },
    ] })).toEqual([{ role: "assistant", text: "completed Read files\nin_progress Write tests" }]);
  });

  test("only final tool updates emit results and retain the tool name", () => {
    const builder = acpEntryBuilder();
    builder.push({ sessionUpdate: "tool_call", toolCallId: "call", title: "Read", name: "read_file" });
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "call", status: "in_progress" })).toEqual([]);
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "call", status: "completed", content: [
      { type: "content", content: { type: "text", text: "result" } },
    ] })).toEqual([{ role: "tool", tool: "read_file", text: "result", isError: false }]);
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "failed", status: "failed", rawOutput: "failure" })).toEqual([
      { role: "tool", tool: "failed", text: "failure", isError: true },
    ]);
  });

  test("retains initial tool content until status-only completion", () => {
    const builder = acpEntryBuilder();
    builder.push({ sessionUpdate: "tool_call", toolCallId: "call", title: "Read", content: [
      { type: "content", content: { type: "text", text: "initial result" } },
    ] });
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "call", status: "completed" })).toEqual([
      { role: "tool", tool: "Read", text: "initial result", isError: false },
    ]);
  });

  test("retains intermediate tool content and name until status-only completion", () => {
    const builder = acpEntryBuilder();
    builder.push({ sessionUpdate: "tool_call", toolCallId: "call", title: "Read", content: [
      { type: "content", content: { type: "text", text: "initial result" } },
    ] });
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "call", status: "in_progress", name: "read_file", content: [
      { type: "content", content: { type: "text", text: "updated result" } },
    ] })).toEqual([]);
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "call", status: "completed" })).toEqual([
      { role: "tool", tool: "read_file", text: "updated result", isError: false },
    ]);
  });

  test("retains initial and intermediate raw output until status-only completion", () => {
    const builder = acpEntryBuilder();
    builder.push({ sessionUpdate: "tool_call", toolCallId: "initial", title: "Read", rawOutput: "initial output" });
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "initial", status: "completed" })).toEqual([
      { role: "tool", tool: "Read", text: "initial output", isError: false },
    ]);
    builder.push({ sessionUpdate: "tool_call", toolCallId: "updated", title: "Read", rawOutput: "old output" });
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "updated", status: "in_progress", rawOutput: { result: "updated output" } })).toEqual([]);
    expect(builder.push({ sessionUpdate: "tool_call_update", toolCallId: "updated", status: "completed" })).toEqual([
      { role: "tool", tool: "Read", text: '{"result":"updated output"}', isError: false },
    ]);
  });

  test("empty final content falls back to textual raw output", () => {
    expect(acpEntryBuilder().push({ sessionUpdate: "tool_call_update", toolCallId: "call", status: "completed", content: [], rawOutput: "raw result" })).toEqual([
      { role: "tool", tool: "call", text: "raw result", isError: false },
    ]);
  });

  test("image-only final content falls back to textual raw output", () => {
    expect(acpEntryBuilder().push({ sessionUpdate: "tool_call_update", toolCallId: "call", status: "completed", content: [
      { type: "content", content: { type: "image", data: "aW1hZ2U=", mimeType: "image/png" } },
    ], rawOutput: "image result" })).toEqual([
      { role: "tool", tool: "call", text: "image result", isError: false },
    ]);
  });

  test("joins user chunks and separates roles and message ids", () => {
    const builder = acpEntryBuilder();
    expect(builder.push({ sessionUpdate: "user_message_chunk", content: { type: "text", text: "a" } })).toEqual([]);
    expect(builder.push({ sessionUpdate: "user_message_chunk", content: { type: "text", text: "b" } })).toEqual([]);
    expect(builder.push({ sessionUpdate: "agent_message_chunk", messageId: "first", content: { type: "text", text: "c" } })).toEqual([{ role: "user", text: "ab" }]);
    expect(builder.push({ sessionUpdate: "agent_message_chunk", messageId: "second", content: { type: "text", text: "d" } })).toEqual([{ role: "assistant", text: "c" }]);
    expect(builder.flush()).toEqual([{ role: "assistant", text: "d" }]);
  });

  test("ignored updates flush pending text", () => {
    const builder = acpEntryBuilder();
    builder.push({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: "hello" } });
    expect(builder.push({ sessionUpdate: "current_mode_update", currentModeId: "mode" })).toEqual([{ role: "assistant", text: "hello" }]);
    expect(builder.flush()).toEqual([]);
  });

  test("maps every stop reason", () => {
    expect(outcomeOf("end_turn")).toEqual({ state: "done", error: null });
    expect(outcomeOf("cancelled")).toEqual({ state: "aborted", error: null });
    expect(outcomeOf("refusal")).toEqual({ state: "error", error: "refusal" });
    expect(outcomeOf("max_tokens")).toEqual({ state: "error", error: "max_tokens" });
    expect(outcomeOf("max_turn_requests")).toEqual({ state: "error", error: "max_turn_requests" });
  });
});
