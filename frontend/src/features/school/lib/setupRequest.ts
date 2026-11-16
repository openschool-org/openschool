export type SetupRequest = <T>(operation: () => Promise<T>) => Promise<T>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const statusOf = (error: unknown) => (error as { response?: { status?: number } })?.response?.status;

// Spaces setup calls below the API-wide token bucket and retries a short-lived 429,
// so later steps of a large setup are not skipped.
export function createSetupRequest(intervalMs = 40, maxRetries = 3): SetupRequest {
  let lastAt = 0;
  return async <T,>(operation: () => Promise<T>): Promise<T> => {
    const wait = Math.max(0, intervalMs - (Date.now() - lastAt));
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (statusOf(error) !== 429 || attempt >= maxRetries) throw error;
        await sleep(1000 * (attempt + 1));
        lastAt = Date.now();
      }
    }
  };
}
