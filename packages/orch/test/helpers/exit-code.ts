/** Run a command that answers a promise without leaking its process exit code into other tests. */
export async function withExitCodeAsync<T>(action: () => Promise<T>): Promise<T> {
  const previous = process.exitCode;
  try {
    return await action();
  } finally {
    // Bun records a non-zero exit once assigned; writing undefined does not
    // clear that record, so zero is the clean equivalent of an unset code.
    process.exitCode = previous ?? 0;
  }
}
