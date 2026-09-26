import { AxiosError } from "axios";

// Domain/validation errors the backend writes by hand (err.Error()) are safe
// to show as-is; these patterns catch the validation-framework or driver
// text that occasionally slips through instead, so it never reaches the
// user raw (S4).
const UNSAFE_MESSAGE_PATTERNS = [/^Key: '/, /\bSQLSTATE\b/, /\bpq:\s/i, /\bruntime error\b/i, /\bpgx\b/i];

function looksUnsafe(message: string): boolean {
  return UNSAFE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof AxiosError) {
    const backendMessage = (error.response?.data as { error?: string } | undefined)?.error;
    if (backendMessage && !looksUnsafe(backendMessage)) return backendMessage;
  }
  return fallback;
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 404;
}

// Body of a 409 Conflict, for endpoints that explain the conflict (for example failed workflow checks).
export function getConflictData(error: unknown): Record<string, unknown> | null {
  if (error instanceof AxiosError && error.response?.status === 409 && error.response.data && typeof error.response.data === "object") {
    return error.response.data as Record<string, unknown>;
  }
  return null;
}
