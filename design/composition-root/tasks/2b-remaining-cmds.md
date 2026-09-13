# 2b-remaining-cmds

Model: luna:low
Owns: `src/commands/prompt-file.ts`, `src/commands/selection.ts`, `src/commands/help.ts`. Follow `2b-README.md`.

These files have no `orchDir()`, `loadSettings`, or `commandLogger()` calls. The only change: any exported `cmd*` function they define takes `services: Services` first, and any call they make into a 2a-changed helper passes what it now needs (the 2a results are piped to you; the helper files are the truth). If a file defines no `cmd*` and calls no changed helper, leave it untouched and say so in the report.

Also confirm by grep that the set of `cmd*` functions referenced from `src/commands/index.ts` lines 312-372 is fully covered by the 2b tasks: `cmdStatusVerb, cmdEvents, cmdLogs, cmdNotify, cmdQuestions, cmdRuns, cmdQueue, cmdDaemon, cmdDoctor, cmdWork, cmdReviewInteractive, cmdReview, cmdAnswer, cmdResult, cmdSteer, cmdPipe, cmdBroadcast, cmdTail, cmdSession, cmdPanes, cmdSpawn, cmdTile, cmdRun, cmdModel, cmdModels, cmdWait, cmdDispatch, cmdReload, cmdNew, cmdRestart, cmdRename, cmdClose, cmdDetach, cmdAdopt, cmdReap, cmdAbort, cmdKeys, cmdPeek, cmdTabs, cmdTab, cmdFocus, cmdZoom, cmdMove, cmdSpace, cmdClean, cmdGrant, cmdSettingsModels, cmdSettingsNotify, cmdSettingsSkills, cmdSettingsThinking, cmdSettings, cmdSetup`. For each, `grep -n "export .*function <name>" src/commands -r` and report the defining file. Any defining file not owned by a 2b task goes under `CALLERS:` as `<file> defines <cmd> and has no 2b task`.

Tests: none named.
