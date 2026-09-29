export interface BulkActionFailure<T> {
  item: T;
  error: unknown;
}

/** Run each selected item independently so one failure never blocks the rest. */
export async function runBulkAction<T>(
  items: T[],
  action: (item: T) => Promise<unknown>,
): Promise<BulkActionFailure<T>[]> {
  const failures: BulkActionFailure<T>[] = [];
  for (const item of items) {
    try {
      await action(item);
    } catch (error) {
      failures.push({ item, error });
    }
  }
  return failures;
}
