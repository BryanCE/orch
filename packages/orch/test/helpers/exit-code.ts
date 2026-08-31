/** Run a test action without leaking its process exit code into other tests. */
export function withExitCode<T>(action: () => T): T {
  const previous = process.exitCode;
  try {
    return action();
  } finally {
    // Bun records a non-zero exit once assigned; writing undefined does not
    // clear that record, so zero is the clean equivalent of an unset code.
    process.exitCode = previous ?? 0;
  }
}
