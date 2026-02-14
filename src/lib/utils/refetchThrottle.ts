/**
 * Global Refetch Throttle
 * 
 * Prevents cascade refetches when multiple Realtime channels fire simultaneously.
 * Each hook gets a unique key and is limited to 1 refetch per interval.
 * Includes burst detection to auto-increase interval during high-frequency events.
 */

const lastFetchTimes = new Map<string, number>();

const DEFAULT_INTERVAL_MS = 5000; // 5 seconds (increased from 3s)

// Burst detection: track trigger counts per key
const burstCounters = new Map<string, { count: number; windowStart: number; boostedUntil: number }>();
const BURST_WINDOW_MS = 10000; // 10 second window
const BURST_THRESHOLD = 3; // more than 3 triggers in window
const BURST_BOOST_DURATION_MS = 30000; // boost lasts 30 seconds
const BURST_INTERVAL_MS = 10000; // boosted interval: 10 seconds

/**
 * Get effective interval considering burst detection.
 */
function getEffectiveInterval(key: string, baseInterval: number): number {
  const burst = burstCounters.get(key);
  if (burst && Date.now() < burst.boostedUntil) {
    return Math.max(baseInterval, BURST_INTERVAL_MS);
  }
  return baseInterval;
}

/**
 * Track trigger frequency and activate burst mode if needed.
 */
function trackBurst(key: string): void {
  const now = Date.now();
  let burst = burstCounters.get(key);
  
  if (!burst) {
    burst = { count: 0, windowStart: now, boostedUntil: 0 };
    burstCounters.set(key, burst);
  }
  
  // Reset window if expired
  if (now - burst.windowStart > BURST_WINDOW_MS) {
    burst.count = 0;
    burst.windowStart = now;
  }
  
  burst.count++;
  
  // Activate burst mode if threshold exceeded
  if (burst.count > BURST_THRESHOLD) {
    burst.boostedUntil = now + BURST_BOOST_DURATION_MS;
  }
}

/**
 * Creates a throttled version of a refetch function.
 * Only allows the function to execute once per `intervalMs` milliseconds per key.
 * Includes burst detection that auto-increases interval during high-frequency events.
 * 
 * @param key Unique identifier for this refetch (e.g., 'useViagens-{eventoId}')
 * @param fn The refetch function to throttle
 * @param intervalMs Minimum interval between executions (default: 5000ms)
 * @returns A throttled function that schedules execution if called too frequently
 */
export function createThrottledRefetch(
  key: string,
  fn: () => void,
  intervalMs: number = DEFAULT_INTERVAL_MS
): () => void {
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    trackBurst(key);
    
    const now = Date.now();
    const lastFetch = lastFetchTimes.get(key) || 0;
    const effectiveInterval = getEffectiveInterval(key, intervalMs);
    const elapsed = now - lastFetch;

    if (elapsed >= effectiveInterval) {
      // Enough time has passed, execute immediately
      lastFetchTimes.set(key, now);
      fn();
    } else if (!pendingTimer) {
      // Schedule execution for when the interval expires
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        lastFetchTimes.set(key, Date.now());
        fn();
      }, effectiveInterval - elapsed);
    }
    // If there's already a pending timer, ignore (coalesce)
  };
}

/**
 * Cleanup function to clear pending timer (call in useEffect cleanup)
 */
export function clearThrottleKey(key: string): void {
  lastFetchTimes.delete(key);
  burstCounters.delete(key);
}
