/**
 * Global Refetch Throttle
 * 
 * Prevents cascade refetches when multiple Realtime channels fire simultaneously.
 * Each hook gets a unique key and is limited to 1 refetch per interval.
 */

const lastFetchTimes = new Map<string, number>();

const DEFAULT_INTERVAL_MS = 3000; // 3 seconds

/**
 * Creates a throttled version of a refetch function.
 * Only allows the function to execute once per `intervalMs` milliseconds per key.
 * 
 * @param key Unique identifier for this refetch (e.g., 'useViagens-{eventoId}')
 * @param fn The refetch function to throttle
 * @param intervalMs Minimum interval between executions (default: 3000ms)
 * @returns A throttled function that schedules execution if called too frequently
 */
export function createThrottledRefetch(
  key: string,
  fn: () => void,
  intervalMs: number = DEFAULT_INTERVAL_MS
): () => void {
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    const now = Date.now();
    const lastFetch = lastFetchTimes.get(key) || 0;
    const elapsed = now - lastFetch;

    if (elapsed >= intervalMs) {
      // Enough time has passed, execute immediately
      lastFetchTimes.set(key, now);
      fn();
    } else if (!pendingTimer) {
      // Schedule execution for when the interval expires
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        lastFetchTimes.set(key, Date.now());
        fn();
      }, intervalMs - elapsed);
    }
    // If there's already a pending timer, ignore (coalesce)
  };
}

/**
 * Cleanup function to clear pending timer (call in useEffect cleanup)
 */
export function clearThrottleKey(key: string): void {
  lastFetchTimes.delete(key);
}
