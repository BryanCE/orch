// We use node:sqlite on purpose (Rule 6), and Node prints an ExperimentalWarning
// for it on every process start — noise on every orch command. Drop that one
// warning; every other process warning still reaches stderr untouched.
const emit = process.emit.bind(process);
process.emit = ((event: string, ...args: unknown[]): boolean => {
  const warning = args[0];
  if (event === "warning" && warning instanceof Error && warning.name === "ExperimentalWarning" && /SQLite/i.test(warning.message)) {
    return false;
  }
  return emit(event as never, ...(args as never[]));
}) as typeof process.emit;
