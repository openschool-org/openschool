// Matches a leading +94 or 0 followed by exactly 9 digits — the same shape
// covers both mobile numbers (07x...) and landlines with a 2-digit area code
// (011, 021, ...), since Sri Lankan subscriber numbers are always a 2-digit
// prefix + 7 digits after the leading 0/+94. Mirrors the backend's
// internal/validation/phone.go — keep both in sync if this ever changes.
const SRI_LANKAN_PHONE = /^(?:\+94|0)\d{9}$/;

// An empty string is considered valid here — most phone fields are optional,
// so callers combine this with their own presence check where a phone number
// is actually required.
export function isValidSriLankanPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  return SRI_LANKAN_PHONE.test(trimmed);
}

export const PHONE_INVALID_TEXT =
  "Enter a valid Sri Lankan number, e.g. 0771234567, 0112345678, or +94771234567.";
