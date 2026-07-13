
  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2054:29]
 2053 │   }
 2054 │   const wss = r?.workspaces || [];
      ·                             ──
 2055 │   if (!wss.length) {
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .workspaces on an `any` value.
      ╭─[src/commands.ts:2054:18]
 2053 │   }
 2054 │   const wss = r?.workspaces || [];
      ·                  ──────────
 2055 │   if (!wss.length) {
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .length on an `any` value.
      ╭─[src/commands.ts:2055:12]
 2054 │   const wss = r?.workspaces || [];
 2055 │   if (!wss.length) {
      ·            ──────
 2056 │     process.stdout.write("No workspaces.\n");
      ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
      ╭─[src/commands.ts:2060:9]
 2059 │       const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
 2060 │ ╭─▶   const rows = wss.map((w: any) => [
 2061 │ │       w.workspace_id + (w.focused ? "*" : ""),
 2062 │ │       w.label || "-",
 2063 │ │       String(w.number ?? "-"),
 2064 │ │       String(w.tab_count ?? "-"),
 2065 │ │       String(w.pane_count ?? "-"),
 2066 │ │       w.agent_status || "-",
 2067 │ ╰─▶   ]);
 2068 │       process.stdout.write(renderTable(headers, rows, [8, 24, 4, 5, 6, 10]) + "\n");
      ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
      ╭─[src/commands.ts:2060:16]
 2059 │   const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
 2060 │   const rows = wss.map((w: any) => [
      ·                ───────
 2061 │     w.workspace_id + (w.focused ? "*" : ""),
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .map on an `any` value.
      ╭─[src/commands.ts:2060:20]
 2059 │   const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
 2060 │   const rows = wss.map((w: any) => [
      ·                    ───
 2061 │     w.workspace_id + (w.focused ? "*" : ""),
      ╰────

  × typescript(no-unsafe-return): Unsafe return of a value of type `any[]`.
      ╭─[src/commands.ts:2060:36]
 2059 │       const headers = ["WS", "LABEL", "NUM", "TABS", "PANES", "STATUS"];
 2060 │ ╭─▶   const rows = wss.map((w: any) => [
 2061 │ │       w.workspace_id + (w.focused ? "*" : ""),
 2062 │ │       w.label || "-",
 2063 │ │       String(w.number ?? "-"),
 2064 │ │       String(w.tab_count ?? "-"),
 2065 │ │       String(w.pane_count ?? "-"),
 2066 │ │       w.agent_status || "-",
 2067 │ ╰─▶   ]);
 2068 │       process.stdout.write(renderTable(headers, rows, [8, 24, 4, 5, 6, 10]) + "\n");
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .workspace_id on an `any` value.
      ╭─[src/commands.ts:2061:7]
 2060 │   const rows = wss.map((w: any) => [
 2061 │     w.workspace_id + (w.focused ? "*" : ""),
      ·       ────────────
 2062 │     w.label || "-",
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .focused on an `any` value.
      ╭─[src/commands.ts:2061:25]
 2060 │   const rows = wss.map((w: any) => [
 2061 │     w.workspace_id + (w.focused ? "*" : ""),
      ·                         ───────
 2062 │     w.label || "-",
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2062:13]
 2061 │     w.workspace_id + (w.focused ? "*" : ""),
 2062 │     w.label || "-",
      ·             ──
 2063 │     String(w.number ?? "-"),
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .label on an `any` value.
      ╭─[src/commands.ts:2062:7]
 2061 │     w.workspace_id + (w.focused ? "*" : ""),
 2062 │     w.label || "-",
      ·       ─────
 2063 │     String(w.number ?? "-"),
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .number on an `any` value.
      ╭─[src/commands.ts:2063:14]
 2062 │     w.label || "-",
 2063 │     String(w.number ?? "-"),
      ·              ──────
 2064 │     String(w.tab_count ?? "-"),
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .tab_count on an `any` value.
      ╭─[src/commands.ts:2064:14]
 2063 │     String(w.number ?? "-"),
 2064 │     String(w.tab_count ?? "-"),
      ·              ─────────
 2065 │     String(w.pane_count ?? "-"),
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .pane_count on an `any` value.
      ╭─[src/commands.ts:2065:14]
 2064 │     String(w.tab_count ?? "-"),
 2065 │     String(w.pane_count ?? "-"),
      ·              ──────────
 2066 │     w.agent_status || "-",
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2066:20]
 2065 │     String(w.pane_count ?? "-"),
 2066 │     w.agent_status || "-",
      ·                    ──
 2067 │   ]);
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .agent_status on an `any` value.
      ╭─[src/commands.ts:2066:7]
 2065 │     String(w.pane_count ?? "-"),
 2066 │     w.agent_status || "-",
      ·       ────────────
 2067 │   ]);
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string[][].
      ╭─[src/commands.ts:2068:45]
 2067 │   ]);
 2068 │   process.stdout.write(renderTable(headers, rows, [8, 24, 4, 5, 6, 10]) + "\n");
      ·                                             ────
 2069 │ }
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2088:43]
 2087 │     else if (argument === "--then") {
 2088 │       flags.thenTarget = commandArgs[++i] || null;
      ·                                           ──
 2089 │       flags.thenNote = commandArgs.slice(i + 1).join(" ");
      ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
      ╭─[src/commands.ts:2125:56]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                        ──────────────────────────────────────────────────────────
 2126 │   }
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .trim on an `any` value.
      ╭─[src/commands.ts:2125:110]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                                                                              ────
 2126 │   }
      ╰────

  × typescript(no-unsafe-call): Unsafe call of a(n) `any` typed value.
      ╭─[src/commands.ts:2125:56]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                        ───────────────────────────────────────────────────
 2126 │   }
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .toString on an `any` value.
      ╭─[src/commands.ts:2125:99]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                                                                   ────────
 2126 │   }
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2125:89]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                                                         ──
 2126 │   }
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2125:71]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                                       ──
 2126 │   }
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .stderr on an `any` value.
      ╭─[src/commands.ts:2125:64]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                                ──────
 2126 │   }
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2125:81]
 2124 │   } catch (error: any) {
 2125 │     process.stderr.write(`warning: wait done failed: ${(error?.stderr || error?.message || error).toString().trim()}\n`);
      ·                                                                                 ───────
 2126 │   }
      ╰────

  × typescript(require-await): Function has no 'await' expression.
      ╭─[src/commands.ts:2118:1]
 2117 │
 2118 │ async function waitForDispatchCompletion(pane: string): Promise<void> {
      · ────────────────────────────────────────
 2119 │   try {
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2134:40]
 2133 │     const { old, now } = await doModel(settings.pane, settings.model);
 2134 │     process.stdout.write(`model: ${old || "(unknown)"} → ${now || "(sent, unverified)"}\n`);
      ·                                        ──
 2135 │   }
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2134:66]
 2133 │     const { old, now } = await doModel(settings.pane, settings.model);
 2134 │     process.stdout.write(`model: ${old || "(unknown)"} → ${now || "(sent, unverified)"}\n`);
      ·                                                                ──
 2135 │   }
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2137:83]
 2136 │   const result = doRun(settings.pane, workerPrompt(settings.prompt, settings.raw));
 2137 │   recordSpawned(settings.pane, { adapter: settings.adapter, model: settings.model || undefined });
      ·                                                                                   ──
 2138 │   process.stdout.write(`Dispatched to ${settings.pane} → status: ${result.status || "unknown"}${result.retried ? " (retried)" : ""}\n`);
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2138:84]
 2137 │   recordSpawned(settings.pane, { adapter: settings.adapter, model: settings.model || undefined });
 2138 │   process.stdout.write(`Dispatched to ${settings.pane} → status: ${result.status || "unknown"}${result.retried ? " (retried)" : ""}\n`);
      ·                                                                                  ──
 2139 │   if (settings.destination) {
      ╰────

  × typescript(no-unsafe-assignment): Unsafe assignment of an any value.
      ╭─[src/commands.ts:2167:9]
 2166 │ function daemonLockPid(): number | undefined {
 2167 │   const lock = readJSON(path.join(orchDir(), "orchd.lock"));
      ·         ───────────────────────────────────────────────────
 2168 │   return Number.isInteger(lock?.pid) && lock.pid > 0 ? lock.pid : undefined;
      ╰────

  × typescript(no-unsafe-return): Unsafe return of a value of type `any`.
      ╭─[src/commands.ts:2168:3]
 2167 │   const lock = readJSON(path.join(orchDir(), "orchd.lock"));
 2168 │   return Number.isInteger(lock?.pid) && lock.pid > 0 ? lock.pid : undefined;
      ·   ──────────────────────────────────────────────────────────────────────────
 2169 │ }
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .pid on an `any` value.
      ╭─[src/commands.ts:2168:33]
 2167 │   const lock = readJSON(path.join(orchDir(), "orchd.lock"));
 2168 │   return Number.isInteger(lock?.pid) && lock.pid > 0 ? lock.pid : undefined;
      ·                                 ───
 2169 │ }
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .pid on an `any` value.
      ╭─[src/commands.ts:2168:46]
 2167 │   const lock = readJSON(path.join(orchDir(), "orchd.lock"));
 2168 │   return Number.isInteger(lock?.pid) && lock.pid > 0 ? lock.pid : undefined;
      ·                                              ───
 2169 │ }
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .pid on an `any` value.
      ╭─[src/commands.ts:2168:61]
 2167 │   const lock = readJSON(path.join(orchDir(), "orchd.lock"));
 2168 │   return Number.isInteger(lock?.pid) && lock.pid > 0 ? lock.pid : undefined;
      ·                                                             ───
 2169 │ }
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2396:62]
 2395 │     case undefined: case "status": cmdStatus(cmd === undefined ? argv : rest); break;
 2396 │     case "events": void cmdEvents(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                              ───────────────────────────────
 2397 │     case "notify": void cmdNotify(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2396:77]
 2395 │     case undefined: case "status": cmdStatus(cmd === undefined ? argv : rest); break;
 2396 │     case "events": void cmdEvents(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                             ──
 2397 │     case "notify": void cmdNotify(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2396:69]
 2395 │     case undefined: case "status": cmdStatus(cmd === undefined ? argv : rest); break;
 2396 │     case "events": void cmdEvents(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                     ───────
 2397 │     case "notify": void cmdNotify(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2397:62]
 2396 │     case "events": void cmdEvents(rest).catch((error) => die(error?.message || String(error))); break;
 2397 │     case "notify": void cmdNotify(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                              ───────────────────────────────
 2398 │     case "questions": cmdQuestions(); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2397:77]
 2396 │     case "events": void cmdEvents(rest).catch((error) => die(error?.message || String(error))); break;
 2397 │     case "notify": void cmdNotify(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                             ──
 2398 │     case "questions": cmdQuestions(); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2397:69]
 2396 │     case "events": void cmdEvents(rest).catch((error) => die(error?.message || String(error))); break;
 2397 │     case "notify": void cmdNotify(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                     ───────
 2398 │     case "questions": cmdQuestions(); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2400:62]
 2399 │     case "queue": cmdQueue(rest); break;
 2400 │     case "daemon": void cmdDaemon(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                              ───────────────────────────────
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2400:77]
 2399 │     case "queue": cmdQueue(rest); break;
 2400 │     case "daemon": void cmdDaemon(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                             ──
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2400:69]
 2399 │     case "queue": cmdQueue(rest); break;
 2400 │     case "daemon": void cmdDaemon(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                     ───────
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2401:62]
 2400 │     case "daemon": void cmdDaemon(rest).catch((error) => die(error?.message || String(error))); break;
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                              ───────────────────────────────
 2402 │     case "work": void cmdWork(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2401:77]
 2400 │     case "daemon": void cmdDaemon(rest).catch((error) => die(error?.message || String(error))); break;
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                             ──
 2402 │     case "work": void cmdWork(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2401:69]
 2400 │     case "daemon": void cmdDaemon(rest).catch((error) => die(error?.message || String(error))); break;
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                     ───────
 2402 │     case "work": void cmdWork(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2402:58]
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
 2402 │     case "work": void cmdWork(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                          ───────────────────────────────
 2403 │     case "review": cmdReview(rest); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2402:73]
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
 2402 │     case "work": void cmdWork(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                         ──
 2403 │     case "review": cmdReview(rest); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2402:65]
 2401 │     case "doctor": void cmdDoctor(rest).catch((error) => die(error?.message || String(error))); break;
 2402 │     case "work": void cmdWork(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                 ───────
 2403 │     case "review": cmdReview(rest); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2412:60]
 2411 │     case "panes": cmdPanes(); break;
 2412 │     case "spawn": void cmdSpawn(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                            ───────────────────────────────
 2413 │     case "tile": void cmdTile(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2412:75]
 2411 │     case "panes": cmdPanes(); break;
 2412 │     case "spawn": void cmdSpawn(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                           ──
 2413 │     case "tile": void cmdTile(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2412:67]
 2411 │     case "panes": cmdPanes(); break;
 2412 │     case "spawn": void cmdSpawn(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                   ───────
 2413 │     case "tile": void cmdTile(rest).catch((error) => die(error?.message || String(error))); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2413:58]
 2412 │     case "spawn": void cmdSpawn(rest).catch((error) => die(error?.message || String(error))); break;
 2413 │     case "tile": void cmdTile(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                          ───────────────────────────────
 2414 │     case "run": cmdRun(rest); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2413:73]
 2412 │     case "spawn": void cmdSpawn(rest).catch((error) => die(error?.message || String(error))); break;
 2413 │     case "tile": void cmdTile(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                         ──
 2414 │     case "run": cmdRun(rest); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2413:65]
 2412 │     case "spawn": void cmdSpawn(rest).catch((error) => die(error?.message || String(error))); break;
 2413 │     case "tile": void cmdTile(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                 ───────
 2414 │     case "run": cmdRun(rest); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2415:60]
 2414 │     case "run": cmdRun(rest); break;
 2415 │     case "model": void cmdModel(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                            ───────────────────────────────
 2416 │     case "wait": cmdWait(rest); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2415:75]
 2414 │     case "run": cmdRun(rest); break;
 2415 │     case "model": void cmdModel(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                           ──
 2416 │     case "wait": cmdWait(rest); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2415:67]
 2414 │     case "run": cmdRun(rest); break;
 2415 │     case "model": void cmdModel(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                   ───────
 2416 │     case "wait": cmdWait(rest); break;
      ╰────

  × typescript(no-unsafe-argument): Unsafe argument of type any assigned to a parameter of type string.
      ╭─[src/commands.ts:2417:66]
 2416 │     case "wait": cmdWait(rest); break;
 2417 │     case "dispatch": void cmdDispatch(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                  ───────────────────────────────
 2418 │     case "new": cmdNew(rest); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2417:81]
 2416 │     case "wait": cmdWait(rest); break;
 2417 │     case "dispatch": void cmdDispatch(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                                 ──
 2418 │     case "new": cmdNew(rest); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2417:73]
 2416 │     case "wait": cmdWait(rest); break;
 2417 │     case "dispatch": void cmdDispatch(rest).catch((error) => die(error?.message || String(error))); break;
      ·                                                                         ───────
 2418 │     case "new": cmdNew(rest); break;
      ╰────

  × typescript(prefer-nullish-coalescing): Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`), as it is a safer operator.
      ╭─[src/commands.ts:2432:82]
 2431 │     case "clean": cmdClean(rest); break;
 2432 │     case "setup": void cmdSetup(rest).catch((error) => die(String(error?.message || error))); break;
      ·                                                                                  ──
 2433 │     case "help": case "-h": case "--help": usage(); break;
      ╰────

  × typescript(no-unsafe-member-access): Unsafe member access .message on an `any` value.
      ╭─[src/commands.ts:2432:74]
 2431 │     case "clean": cmdClean(rest); break;
 2432 │     case "setup": void cmdSetup(rest).catch((error) => die(String(error?.message || error))); break;
      ·                                                                          ───────
 2433 │     case "help": case "-h": case "--help": usage(); break;
      ╰────

Found 2 warnings and 1124 errors.
Finished in 5.4s on 43 files with 65 rules using 4 threads.
