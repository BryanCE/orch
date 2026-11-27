# orch update

`orch update` upgrades an installed orch to a newer release, the way other CLI applications update themselves. It is not built. It waits until orch has its first published release.

## Done when

- `orch update` asks the npm registry for the newest release of `@bryance/orch`. `orch update --to <version>` picks one release.
- `orch update --check` prints the installed and the newest version, and changes nothing.
- Before it installs, it shows the release notes and asks to confirm. `--yes` skips the question.
- It refuses while live agents run.
- It stops orchd, installs the release globally, and starts orchd on the new code.
- The new binary opens the store, so drizzle applies the new migrations.
- If any step fails, the old version is installed again and orchd runs on it.
- `bun check` refuses a change to a migration that a published release carries.

## Constraints

- Rule 8: there is one shape for every record. An update never converts an old `settings.json`. An invalid settings file is an error, and the error names the key.
- Rule 14: `SETTINGS_SCHEMA` stays 1. The update does not read or change it.
- Rule 17: every timeout the update uses (registry query, install, daemon stop) is a setting in `settings.json`.
- Rule 21: the CLI asks orchd to stop and to start. It does not reach the daemon process itself.
