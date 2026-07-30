import { AxiosError } from "axios";

// Every handler in the backend returns errors as `{ "error": "..." }` — this
// is the one place that shape gets unwrapped, so a raw AxiosError never
// leaks into a notification.
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}
