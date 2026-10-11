`orch update` installs the newest published orch release, then migrates `settings.json` and
`orch.db` before starting the daemon again. It keeps a backup under `$ORCH_DIR/backups/`.

    orch update

Live workers block an update. Close them first with `orch close --all`. orch refuses a
downgrade. If an update fails, orch reinstalls the old version and restores `settings.json`
and `orch.db`; the backup stays under `$ORCH_DIR/backups/`.
