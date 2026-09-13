import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileSettingsManager } from "../src/settings/manager.ts";
import { repinLiveFleet, type LiveAgentForRepin, type RepinAdapterCapabilities } from "../src/daemon/orchd.ts";
import type { ControlAction, ControlBoundaryOutcome } from "../src/types/control.ts";
import { writeSettingsFixture } from "./helpers/settings.ts";
import { removeTempDir } from "./helpers/tempdir.ts";

function settingsDirectory(thinking: "medium" | "high", model: string): string {
  const directory = mkdtempSync(join(tmpdir(), "orch-daemon-repin-"));
  writeSettingsFixture(directory, { defaults: { thinking, models: { pi: model } } });
  return directory;
}

function agents(): readonly LiveAgentForRepin[] {
  return [{ id: "agent-one", harnessId: "pi" }, { id: "agent-two", harnessId: "pi" }];
}

function adapter(): RepinAdapterCapabilities {
  return { id: "pi", modelControl: {}, bridge: { takes: ["model"] } };
}

describe("daemon settings tuning re-pin", () => {
  const directories: string[] = [];

  afterEach(() => {
    while (directories.length > 0) removeTempDir(directories.pop()!);
  });

  test("pins every live agent to the resolved settings default", async () => {
    const previousDirectory = settingsDirectory("medium", "provider/old");
    const settingsDirectoryNext = settingsDirectory("high", "provider/new");
    directories.push(previousDirectory, settingsDirectoryNext);
    const calls: { target: string; action: Extract<ControlAction, { kind: "model" }> }[] = [];
    const options = {
      previousSettings: fileSettingsManager(previousDirectory).current(),
      settings: fileSettingsManager(settingsDirectoryNext).current(),
      listLiveAgents: agents,
      resolveAdapter: (_agent: LiveAgentForRepin): RepinAdapterCapabilities => adapter(),
      deliver: (target: string, action: Extract<ControlAction, { kind: "model" }>): Promise<ControlBoundaryOutcome> => {
        calls.push({ target, action });
        return Promise.resolve({ outcome: "invoke", ack: "none" });
      },
      logger: {
        info: (event: string): void => { void event; },
        warn: (event: string): void => { void event; },
      },
    };

    await repinLiveFleet(options);

    expect(calls.map((call) => [call.target, call.action.model])).toEqual([
      ["agent-one", "provider/new:high"],
      ["agent-two", "provider/new:high"],
    ]);
    expect(calls.every((call) => call.action.id.length > 0)).toBe(true);
  });

  test("does not pin when tuning settings did not change", async () => {
    const directory = settingsDirectory("medium", "provider/same");
    directories.push(directory);
    let delivered = 0;

    await repinLiveFleet({
      previousSettings: fileSettingsManager(directory).current(),
      settings: fileSettingsManager(directory).current(),
      listLiveAgents: agents,
      resolveAdapter: (_agent: LiveAgentForRepin): RepinAdapterCapabilities => adapter(),
      deliver: (): Promise<ControlBoundaryOutcome> => {
        delivered++;
        return Promise.resolve({ outcome: "invoke", ack: "none" });
      },
      logger: {
        info: (event: string): void => { void event; },
        warn: (event: string): void => { void event; },
      },
    });

    expect(delivered).toBe(0);
  });

  test("continues re-pinning after one agent fails", async () => {
    const previousDirectory = settingsDirectory("medium", "provider/old");
    const settingsDirectoryNext = settingsDirectory("high", "provider/new");
    directories.push(previousDirectory, settingsDirectoryNext);
    const delivered: string[] = [];
    const warnings: string[] = [];

    await repinLiveFleet({
      previousSettings: fileSettingsManager(previousDirectory).current(),
      settings: fileSettingsManager(settingsDirectoryNext).current(),
      listLiveAgents: agents,
      resolveAdapter: (_agent: LiveAgentForRepin): RepinAdapterCapabilities => adapter(),
      deliver: (target: string): Promise<ControlBoundaryOutcome> => {
        if (target === "agent-one") return Promise.reject(new Error("bridge unavailable"));
        delivered.push(target);
        return Promise.resolve({ outcome: "invoke", ack: "none" });
      },
      logger: {
        info: (event: string): void => { void event; },
        warn: (event: string): void => { warnings.push(event); },
      },
    });

    expect(delivered).toEqual(["agent-two"]);
    expect(warnings).toEqual(["settings.repin.failed"]);
  });

});
