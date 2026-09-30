// Mirrors backend internal/validation/phone.go: accepts 0XXXXXXXXX, +94 / 0094 / 94 prefixes, spaces,
// dashes, dots and brackets, and 9 digits whose leading 0 a spreadsheet dropped. The server stores 0XXXXXXXXX.
export function normalizeSriLankanPhone(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  if (!/^\+?[\d\s\-.()]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  if (digits.length === 11 && digits.startsWith("94")) return `0${digits.slice(2)}`;
  if (digits.length === 13 && digits.startsWith("0094")) return `0${digits.slice(4)}`;
  if (digits.length === 9 && !digits.startsWith("0")) return `0${digits}`;
  return null;
}

// Empty is valid because most phone fields are optional; callers add their own presence check.
export function isValidSriLankanPhone(value: string): boolean {
  return normalizeSriLankanPhone(value) !== null;
}

export const PHONE_INVALID_TEXT =
  "Enter a Sri Lankan number, e.g. 0771234567, 077 123 4567, or +94771234567.";
