import { afterEach, describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { HostLinks, type LinkSpawner } from "../src/hosts/link.ts";
import { serveHostLink } from "../src/hosts/serve.ts";
import { latestHostLink } from "../src/store/host-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { processStartToken } from "../src/process-identity.ts";
import { errorMessage } from "../src/util.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { OrchDir } from "../src/types/core.ts";

const dirs: OrchDir[] = [];
const links: HostLinks[] = [];

afterEach(() => {
  for (const link of links.splice(0)) link.closeAll();
  closeAllStores();
  while (dirs.length) removeTempDir(dirs.pop()!);
});

function greeting(id: string): HostGreeting {
  return { host: { id, name: `machine-${id}`, os: "linux" }, codeHash: null, version: "0.1.0" };
}

/** A far side that runs `orch host serve` in-process, answering as `id`. */
function farHost(id: string): LinkSpawner {
  return () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const exited = serveHostLink(stdin, stdout, greeting(id)).then(() => 0);
    return { stdin, stdout, stderr, exited, kill: () => { stdin.end(); } };
  };
}

/** A far side whose login shell has no orch on its PATH. */
const noOrch: LinkSpawner = () => {
  const stderr = new PassThrough();
  stderr.end("sh: 1: orch: not found\n");
  return { stdin: new PassThrough(), stdout: new PassThrough(), stderr, exited: Promise.resolve(127), kill: () => undefined };
};

/** The message a promise rejected with, or null when it resolved. */
function refusal(promise: Promise<unknown>): Promise<string | null> {
  return promise.then(() => null, (error: unknown) => errorMessage(error));
}

function hostLinks(spawn: LinkSpawner): HostLinks {
  const orchDir = tempOrchDir("orch-host-link-");
  dirs.push(orchDir);
  const services = testServices({ orchDir, settings: { hosts: { box: { dest: "box" } }, links: { request_timeout_ms: 500 } } });
  const made = new HostLinks({ orchDir, settings: () => services.settings.current(), logger: services.logger, spawn });
  links.push(made);
  return made;
}

describe("a link to another host", () => {
  test("comes up, binds the name to the machine that answered, and records the link", async () => {
    const hosts = hostLinks(farHost("far-1"));
    const answered = await hosts.link("box").connect();
    expect(answered.host.id).toBe("far-1");
    const [view] = hosts.views();
    expect(view).toMatchObject({ name: "box", dest: "box", state: "up", hostId: "far-1" });
    expect(latestHostLink(dirs[0]!, "far-1")?.until).toBeNull();
  });

  test("asks the far side whether a process there is alive", async () => {
    const hosts = hostLinks(farHost("far-2"));
    const link = hosts.link("box");
    await link.connect();
    const startToken = processStartToken(process.pid) ?? null;
    expect(await link.alive({ pid: process.pid, startToken })).toEqual({ alive: true });
  });

  test("refuses a different machine answering on a name another machine holds", async () => {
    let answerAs = "far-a";
    const hosts = hostLinks((orchDir, host, settings, args) => farHost(answerAs)(orchDir, host, settings, args));
    const link = hosts.link("box");
    await link.connect();
    link.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    answerAs = "far-b";
    expect(await refusal(link.connect())).toMatch(/answered as host machine-far-b.*bound to host id far-a/);
    expect(link.current().kind).toBe("down");
  });

  test("says orch is missing there when the far shell cannot find it", async () => {
    const hosts = hostLinks(noOrch);
    expect(await refusal(hosts.link("box").requireUp())).toBe("box is offline: orch is not installed on box, or is not on the PATH that account's shell sets. Run orch host add box again to see which orch it finds. orch has never reached it.");
  });

  test("goes down when the far side ends, and a question to it fails rather than waits", async () => {
    const hosts = hostLinks(farHost("far-3"));
    const link = hosts.link("box");
    await link.connect();
    link.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(link.current().kind).toBe("down");
    expect(latestHostLink(dirs[0]!, "far-3")?.until).not.toBeNull();
    expect(await refusal(link.ping())).toMatch(/^box is not linked/);
  });

  test("refuses a name settings does not give a host", () => {
    const hosts = hostLinks(farHost("far-4"));
    expect(() => hosts.link("nowhere")).toThrow("no host named nowhere in settings.hosts; configured: box");
  });
});
