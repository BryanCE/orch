# W3: how pi handles global and project settings

Context. orch is adding a settings file per project beside its one global file, and has to
decide what a "project" is. pi, the coding agent, already has global and project settings. The
pi source is at `/home/bryan/src/pi`. The installed build is at
`/home/bryan/.bun/install/global/node_modules/@earendil-works/pi-coding-agent/`. This task only
reads files and writes one report file. Edit nothing else. Run no command.

Report file format: Markdown, one `##` heading per numbered question, each fact as a bullet
ending in `path:line`. Quote the code for every fact in a code block, because each quote will
be checked. Write "not found" under a question whose answer is not in the source, with what
you searched for.

## T1 pi's settings files
Read pi's settings code and docs under `/home/bryan/src/pi`. Start with files named like
`settings-manager.ts`, `config.ts`, `resource-loader.ts`, and the docs that mention
`settings.json`. Write `project-settings/findings/L6-pi-settings.md` answering:
1. Where the global settings file lives and where the project settings file lives. Quote the
   code that builds each path.
2. How pi decides which directory is the project: the process working directory as it is, a
   walk up to a marker such as `.git` or `.pi`, or something else. Quote the code. Say what
   happens when pi starts in a subdirectory of a project that has a `.pi/settings.json` at
   its top.
3. Does git play any part in finding the project settings file? Quote the code or write "no".
4. How a project value and a global value combine: which wins, whether nested objects merge
   key by key, what happens to arrays. Quote the merge function.
5. Which settings may live in the project file. Is any setting global-only? Quote the code.
6. When pi writes a setting, which file does it write, and how does a caller choose global or
   project? Quote the write functions and their signatures.
7. `trust.json` under `~/.pi/agent/`: what it records, what reads it, what a project must be
   trusted for, and what pi does with an untrusted project's settings, extensions or other
   project resources. Quote the code and any doc text.
8. Other per-project resources pi loads besides settings: context files such as `AGENTS.md`,
   skills, extensions, prompts. For each, is it found in the working directory only or by
   walking up, and to where does the walk go? Quote the code.
9. Any doc text that explains to a user the difference between global and project settings.
   Quote it with its file and line.
Do only this. If something does not fit, report it in one line and stop.
Report: one line. "done: <files>" or "blocked: <exact error>".
