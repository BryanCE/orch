import { afterEach, describe, expect, test } from "bun:test";
import { PassThrough } from "node:stream";
import { HostLinks, type LinkSpawner } from "../src/hosts/link.ts";
import { startFarOrchd, type FarOrchd } from "./helpers/far-orchd.ts";
import { latestHostLink } from "../src/store/host-rows.ts";
import { closeAllStores } from "../src/store/connection.ts";
import { processStartToken } from "../src/process-identity.ts";
import { errorMessage } from "../src/util.ts";
import { removeTempDir, tempOrchDir } from "./helpers/tempdir.ts";
import { testServices } from "./helpers/services.ts";
import type { HostGreeting } from "../src/types/host.ts";
import type { OrchDir } from "../src/types/core.ts";
import { testHost, hosted } from "./helpers/host.ts";
import { hostIdFrom } from "../src/host.ts";

const dirs: OrchDir[] = [];
/** Directories that are not this machine's orch dir: far hosts', and a stand-in orchd's. */
const otherDirs: OrchDir[] = [];
const links: HostLinks[] = [];

const fars: FarOrchd[] = [];

afterEach(async () => {
  for (const link of links.splice(0)) link.closeAll();
  closeAllStores();
  while (fars.length) await fars.pop()!.close();
  for (const dir of [...dirs.splice(0), ...otherDirs.splice(0)]) removeTempDir(dir);
});

function greeting(id: string): HostGreeting {
  return { host: testHost(id, `machine-${id}`), commit: null, version: "0.1.0" };
}

/** A far host: a real orchd in-process answering as `id`, reached through `orch host serve`. */
function farHost(id: string): LinkSpawner {
  const started = startFarOrchd(greeting(id)).then((far) => { fars.push(far); return far; });
  return (orchDir, host, settings, args) => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const exited = started.then((far) => {
      const link = far.spawner()(orchDir, host, settings, args);
      stdin.pipe(link.stdin);
      link.stdout.pipe(stdout);
      stdin.once("end", () => { link.kill(); });
      return link.exited;
    }).then((code) => { stdout.end(); return code; });
    return { stdin, stdout, stderr, exited, kill: () => { stdin.end(); } };
  };
}

/** A far side whose login shell has no orch on its PATH. */
const noOrch: LinkSpawner = () => {
  const stderr = new PassThrough();
  stderr.end("sh: 1: orch: not found\n");
  return { stdin: new PassThrough(), stdout: new PassThrough(), stderr, exited: Promise.resolve(127), kill: () => undefined };
};

/** A far side running orch from another commit, whose greeting has a shape this one does not read. */
const otherBuild: LinkSpawner = () => {
  const stdout = new PassThrough();
  stdout.write(`${JSON.stringify({ id: 0, result: { host: { id: "far-old", name: "old", os: "linux" }, codeHash: "abc", version: "0.1.0" } })}\n`);
  return { stdin: new PassThrough(), stdout, stderr: new PassThrough(), exited: new Promise(() => undefined), kill: () => { stdout.end(); } };
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
  test("says the far side runs another build when its greeting cannot be read", async () => {
    const reason = await refusal(hostLinks(otherBuild).link("box").connect());
    expect(reason).toBe("box answered with a greeting this orch cannot read, so it runs orch built from another commit. Build this machine's commit there");
  });

  test("comes up, binds the name to the machine that answered, and records the link", async () => {
    const hosts = hostLinks(farHost("far-1"));
    const answered = await hosts.link("box").connect();
    expect(answered.host.id).toBe(hostIdFrom("far-1"));
    const [view] = hosts.views();
    expect(view).toMatchObject({ name: "box", dest: "box", state: "up", hostId: "far-1" });
    expect(latestHostLink(dirs[0]!, hostIdFrom("far-1"))?.until).toBeNull();
  });

  test("asks the far side whether a process there is alive", async () => {
    const hosts = hostLinks(farHost("far-2"));
    const link = hosts.link("box");
    await link.connect();
    const startToken = processStartToken(process.pid) ?? null;
    expect(await link.alive([hosted(process.pid, startToken, hostIdFrom("far-2"))])).toEqual([true]);
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
    expect(latestHostLink(dirs[0]!, hostIdFrom("far-3"))?.until).not.toBeNull();
    expect(await refusal(link.ping())).toMatch(/^box is not linked/);
  });

  test("refuses a name settings does not give a host", () => {
    const hosts = hostLinks(farHost("far-4"));
    expect(() => hosts.link("nowhere")).toThrow("no host named nowhere in settings.hosts; configured: box");
  });
});
