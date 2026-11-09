// `orch host`: the other machines orch runs agents on, and the SSH link orchd holds
// to each. `serve` is the far end of that link; orchd starts it over ssh and nobody
// types it.
import { confirm, isCancel } from "@clack/prompts";
import { askDaemon, readRpc } from "./daemon.ts";
import { parseCommand } from "./registry.ts";
import { whoAmI } from "./self.ts";
import { die } from "./target.ts";
import { usageError } from "../cli/usage.ts";
import { requiredWord, writeEmptyOrJson } from "./panes.ts";
import { renderTable } from "../table.ts";
import { formatAge } from "../format.ts";
import { serveHostLink } from "../daemon/client/serve.ts";
import { buildCommit } from "../build-stamp.ts";
import { randomUUID } from "node:crypto";
import { authorizedIn, reportedOrch } from "../shared/host-authorize.ts";
import { callerCredential } from "../identity/credential.ts";
import { detachByte } from "../cli/detach-key.ts";
import { dialScreen, viewScreen } from "./attach.ts";
import { promptSelect } from "../setup/io.ts";
import { writeSettingsValue } from "../settings/write.ts";
import { errorMessage, packageManifest } from "../util.ts";
import { HOST_SHELLS, type HostGreeting, type HostId, type HostLinkView, type HostShell } from "../types/host.ts";
import { isHostId } from "../host.ts";
import type { Invocation } from "../cli/spec.ts";
import type { ResultOf } from "../daemon/client/protocol.ts";
import type { HostSettings } from "../types/settings.ts";
import type { Services } from "../types/services.ts";

/** A host name is one settings key: no dots, nothing a shell or a table would mangle. */
const HOST_NAME = /^[A-Za-z0-9_-]+$/;

/** How long a call that may bring a host's link up waits: ssh's own connect timeout, then
 *  the far side's answer. */
export function hostCallTimeoutMs(services: Pick<Services, "settings">): number {
  const links = services.settings.current().links;
  return links.connect_timeout_s * 1_000 + links.request_timeout_ms;
}

function lastSeenCell(view: HostLinkView): string {
  return view.lastSeen === null ? "never" : `${formatAge(view.lastSeen)} ago`;
}

function commitCell(commit: string | null): string {
  return commit ?? "source";
}

/** What to say when the far side's orch is not this one's. A release is its version: every
 *  install of one carries the commit its package was built from. Past the version, a build
 *  from a checkout is its commit. Null when they match, or when either runs from source. */
function skewWarning(name: string, greeting: HostGreeting, local: { version: string; commit: string | null }): string | null {
  if (greeting.version !== local.version) return `warning: ${name} runs orch ${greeting.version}; this machine runs ${local.version}.`;
  const remote = greeting.commit;
  if (remote === null || local.commit === null) return null;
  if (remote !== local.commit) return `warning: ${name} runs orch built from ${remote}; this machine runs ${local.commit}.`;
  return null;
}

async function listHosts(services: Services, json: boolean): Promise<void> {
  const { hosts } = await readRpc(services, "hosts", undefined);
  if (writeEmptyOrJson(hosts, json, "No hosts configured. Add one under hosts in settings.json.")) return;
  const rows = hosts.map((view) => [view.name, view.dest, view.state, view.greeting?.host.name ?? "-", lastSeenCell(view), view.reason ?? ""]);
  process.stdout.write(renderTable(["NAME", "DEST", "LINK", "HOST", "LAST SEEN", "REASON"], rows, [16, 32, 10, 24, 12, 80]) + "\n");
}

async function checkHost(services: Services, name: string, json: boolean): Promise<void> {
  const view = await readRpc(services, "host-check", { name }, hostCallTimeoutMs(services));
  if (json) {
    process.stdout.write(JSON.stringify(view, null, 2) + "\n");
    return;
  }
  const greeting = view.greeting;
  if (greeting === null) {
    process.stdout.write(`${view.name}: ${view.state}\n`);
    return;
  }
  process.stdout.write(`${view.name}: up. Host ${greeting.host.name}, ${greeting.host.os}, id ${greeting.host.id}. orch ${greeting.version}, built from ${commitCell(greeting.commit)}.\n`);
  const warning = skewWarning(view.name, greeting, { version: packageManifest().version, commit: buildCommit() });
  if (warning !== null) process.stdout.write(`${warning}\n`);
}

async function forgetHost(services: Services, name: string, json: boolean): Promise<void> {
  const result = await readRpc(services, "host-forget", { name });
  process.stdout.write(json ? JSON.stringify(result) + "\n" : `Forgot which machine ${name} was. The next host to answer on its route takes the name.\n`);
}

function isHostShell(value: string): value is HostShell {
  return HOST_SHELLS.some((shell) => shell === value);
}

/** The host entry `add` writes, from its flags. */
/** The host as the flags state it, over what settings already hold for it: adding a host
 *  again keeps its destination, port, shell and orch_dir unless a flag changes them. */
function hostFromFlags(invocation: Invocation, saved: HostSettings | undefined): HostSettings {
  const dest = invocation.flags.value("--dest") ?? saved?.dest;
  if (dest === undefined) throw usageError(invocation);
  const port = invocation.flags.value("--port");
  const shell = invocation.flags.value("--shell");
  if (port !== undefined && !/^[1-9][0-9]*$/.test(port)) die(`--port ${port} is not a port number`);
  if (shell !== undefined && !isHostShell(shell)) die(`--shell ${shell} is not one of ${HOST_SHELLS.join(", ")}`);
  return {
    ...saved,
    dest,
    ...(port === undefined ? {} : { port: Number(port) }),
    ...(shell === undefined ? {} : { shell }),
  };
}

/** The line to put in authorized_keys on a host, and where it goes. */
function authorizeInstructions(name: string, step: ResultOf<"host-key">): string {
  return [
    `On ${name}, in ${step.where}, paste:`,
    "",
    `  ${step.command}`,
    "",
    "Then, here:",
    "",
    `  orch host check ${name}`,
    "",
  ].join("\n");
}

/** What a host presents, as orchd fetched it, or a refusal that says why no key came back. */
async function presentedKeys(services: Services, host: HostSettings): Promise<ResultOf<"host-scan">> {
  let scan: ResultOf<"host-scan">;
  try {
    scan = await askDaemon(services, "host-scan", { caller: callerCredential(), host }, hostCallTimeoutMs(services));
  } catch (error: unknown) {
    die(`could not fetch ${host.dest}'s host key: ${errorMessage(error)}`);
  }
  if (scan.keys.length === 0) die(`${host.dest} presented no host key`);
  return scan;
}

/** Log in once as the person and put orch's key in place there. orchd runs the login in a
 *  terminal it holds; this one shows it and types into it, the password included. What the
 *  host printed; null when the login did not put the key in place. */
async function installKey(services: Services, host: HostSettings): Promise<string | null> {
  const socket = await dialScreen(services);
  const key = `host-login-${randomUUID()}`;
  let output = "";
  const end = await viewScreen(services, socket, detachByte(services.settings.current().attach.detach_key), {
    key,
    replace: false,
    open: (send, size) => { send("host-authorize", { caller: callerCredential(), host, key, ...size }); },
    opened: () => undefined,
    output: (data) => { output += data; },
  });
  if (end.kind === "refused") die(end.message);
  return authorizedIn(output) ? output : null;
}

/** Where orch runs on a Windows host. The person says; WSL first, the way orch is usually run there. */
async function askWindowsShell(name: string): Promise<HostShell> {
  const answer = await promptSelect<HostShell>(`${name} runs Windows. Where is the orch you want it to run?`, [
    { value: "wsl", label: "Inside WSL" },
    { value: "windows", label: "On Windows" },
  ], "wsl");
  if (answer === null) die(`${name} was not added.`);
  return answer;
}

/** Where on a host the orch is that its shell found, for the person reading. */
function placeOn(name: string, host: HostSettings): string {
  if (host.shell === "wsl") return `inside WSL on ${name}`;
  if (host.shell === "windows") return `on Windows on ${name}`;
  return `on ${name}`;
}

/** Why the orch a host reported cannot answer the link; null when it can. */
function unusableOrch(name: string, host: HostSettings, orch: string | null): string | null {
  const place = placeOn(name, host);
  if (orch === null) return `orch's key is in place, but there is no orch ${place}. Install orch there, then run: orch host check ${name}`;
  // WSL sees the Windows PATH under /mnt; an orch there is Windows' install, not WSL's.
  if (host.shell === "wsl" && orch.startsWith("/mnt/")) {
    return `orch's key is in place, but the only orch ${place} is ${orch}, which is Windows' install. Install orch inside WSL there, then run: orch host check ${name}`;
  }
  return null;
}

/** Add a host: confirm the key it presents, trust it, log in once to put orch's key in
 *  place, and check that the orch it will start answers.
 *  The human's alone, at a terminal: it decides which machines orch may reach. */
async function addHost(services: Services, invocation: Invocation): Promise<void> {
  if ((await whoAmI(services)).kind !== "operator") die("orch host add is the human's to run: it decides which machines orch may reach.");
  if (!process.stdin.isTTY) die("orch host add asks you to confirm the host's key; run it in a terminal.");
  const name = requiredWord(invocation, 0);
  if (!HOST_NAME.test(name)) die(`host name ${name} must be letters, digits, - and _`);
  const stated = hostFromFlags(invocation, services.settings.current().hosts[name]);
  const scan = await presentedKeys(services, stated);
  process.stdout.write(`\n${stated.dest} presents:\n\n${scan.keys.map((key) => `  ${key.fingerprint}`).join("\n")}\n\n`);
  const answer = await confirm({ message: `Trust these keys for ${name}?`, initialValue: false });
  if (isCancel(answer) || answer !== true) die(`${name} was not added.`);
  const shell = stated.shell ?? (scan.windows ? await askWindowsShell(name) : "posix");
  const host: HostSettings = { ...stated, ...(shell === "posix" ? {} : { shell }) };
  await readRpc(services, "host-trust", { caller: callerCredential(), host, keys: scan.keys });
  writeSettingsValue(services.settings, `hosts.${name}`, host);
  process.stdout.write(`\nLogging in to ${name} once, as ${host.dest}, to install orch's key. Type that account's password if ssh asks.\n\n`);
  const output = await installKey(services, host);
  if (output === null) {
    const step = await readRpc(services, "host-key", { host });
    process.stdout.write(`\nThat login did not install it. Do it by hand instead:\n\n${authorizeInstructions(name, step)}`);
    return;
  }
  const orch = reportedOrch(output);
  const problem = unusableOrch(name, host, orch);
  if (problem !== null) die(problem);
  process.stdout.write(`\nThe link will run ${orch ?? ""} ${placeOn(name, host)}.\n\nChecking the link...\n\n`);
  await checkHost(services, name, false);
}

/** Print the authorized_keys line for a configured host again. */
async function printHostKey(services: Services, name: string): Promise<void> {
  const host = services.settings.current().hosts[name];
  if (host === undefined) die(`no host named ${name} in settings.hosts; add it with orch host add ${name} --dest user@host`);
  process.stdout.write(authorizeInstructions(name, await readRpc(services, "host-key", { host })));
}

/** The origin `orch host serve` speaks for, which only the forced command can name. */
function pinnedOrigin(invocation: Invocation): HostId {
  const origin = invocation.flags.value("--origin");
  if (origin === undefined || !isHostId(origin)) throw usageError(invocation);
  return origin;
}

export async function cmdHost(services: Services, args: string[]): Promise<void> {
  const invocation = parseCommand("host", args);
  const json = invocation.flags.has("--json");
  switch (invocation.command.name) {
    case "add": return addHost(services, invocation);
    case "key": return printHostKey(services, requiredWord(invocation, 0));
    case "check": return checkHost(services, requiredWord(invocation, 0), json);
    case "forget": return forgetHost(services, requiredWord(invocation, 0), json);
    case "serve": return serveHostLink(process.stdin, process.stdout, {
      orchDir: services.orchDir,
      origin: pinnedOrigin(invocation),
      logger: services.logger,
      connectTimeoutMs: services.settings.current().links.request_timeout_ms,
    });
    default:
      if (invocation.positional.length) throw usageError(invocation);
      return listHosts(services, json);
  }
}
