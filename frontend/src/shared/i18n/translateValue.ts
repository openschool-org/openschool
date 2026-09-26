import { en, type MessageKey } from "@/shared/i18n/messages/en";
import type { Translate } from "@/shared/i18n/i18nContext";
import { capitalize } from "@/shared/lib/text";

// Translates a known data value such as an attendance status; unknown values show as stored.
export function translateValue(t: Translate, prefix: string, value: string | null | undefined, fallback = "-"): string {
  if (!value) return fallback;
  const key = `${prefix}.${value.toLowerCase()}`;
  return key in en ? t(key as MessageKey) : capitalize(value);
}
