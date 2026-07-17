import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatAge, isQuestionPayload, questionText, cmdResult } from "../src/commands/results.ts";
import { presenceAgentDir } from "../src/store.ts";

describe("commands/results", () => {
  test("validates and extracts question payloads", () => {
    expect(isQuestionPayload({ question: "why?" })).toBe(true);
    expect(questionText({ question: "why?" })).toBe("why?");
    expect(isQuestionPayload({ question: 1 })).toBe(false);
    expect(questionText(null)).toBe("");
  });
  test("formats invalid and recent timestamps", () => {
    expect(formatAge("not-a-date")).toBe("?");
    expect(formatAge(new Date().toISOString())).toBe("0s");
  });
  test("routes a seeded result.json through the command module", () => {
    const root = mkdtempSync(join(tmpdir(), "orch-command-result-"));
    const old = process.env.ORCH_DIR;
    const key = "headless~wD~4242";
    process.env.ORCH_DIR = root;
    const dir = presenceAgentDir(key, root);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "status.json"), JSON.stringify({ schema: 2, key, backend: "headless", workspace: "wD", handle: "4242", pid: process.pid, agent: "pi", state: "done" }));
    writeFileSync(join(dir, "result.json"), JSON.stringify({ text: "finished" }));
    const output: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => { output.push(String(chunk)); return true; }) as typeof process.stdout.write;
    try { cmdResult([key]); } finally { process.stdout.write = originalWrite; if (old === undefined) delete process.env.ORCH_DIR; else process.env.ORCH_DIR = old; rmSync(root, { recursive: true, force: true }); }
    expect(output.join("")).toBe("finished\n");
  });
});
