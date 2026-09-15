Live-reload code in place. Touches `reload.signal` so panes and watchers pick up a rebuilt
install. Use after `bun run build:orch:dev`. reload = same session; reset = new session;
restart = new process.
