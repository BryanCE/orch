Bare `orch status` is the normal use: every agent this session owns, with cost and context.
A human at a raw terminal owns none and sees the whole machine.

The table ends with one capacity line:
`pack you 5/10 - pack <other> 2/10 - space <name> 4/6 - machine 7/unlimited`.
One pack per orch, yours first, each against `fleet.max_agents_per_pack`. Packs never sum.
`machine` is the live total against `fleet.max_agents_total`; `unlimited` means that setting
is absent. Read it before every spawn wave. It names the free slots and who holds the rest.

`state` is what the agent says about itself. `backendStatus` (`--json`) is what the plexer
says about the pane, and it lags. Read `state` for completion.

`--json` is a top-level array of rows; filter with `.[]`. Row fields: key agentId
rootAgentId rootAgentName paneId managed name tab agent owner ownerId spawnedBy
spawnedByLabel worktree branch cwd focused model modelShort state stateFallback
staleExtension exited alive cost ctxPercent task dispatchId lastText backendStatus backend
capabilities sessionPath presenceDir presenceOnly bridgeAttached tokens turns spaceId
spaceName host.

Three fields settle arguments. `cwd` is the repo the worker is confined to. `dispatchId`,
against the id `orch dispatch` printed, proves the pane runs the prompt you sent.
`bridgeAttached` says whether a dispatch will deliver or queue.

`--filter` drops columns and rows in one list, e.g. `--filter=owner,env,done`. Columns: host
id env name owner branch tab agent model state cost ctx task last (`--human` adds harness,
cwd, worktree). Any other word drops rows in that state.

Never wrap `orch status` in a loop. `orch monitor` pushes transitions the instant they
happen. Status is for one look.
