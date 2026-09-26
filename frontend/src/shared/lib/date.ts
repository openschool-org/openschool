// Local YYYY-MM-DD; accepts undefined because Carbon DatePicker can pass an empty selection.
export function toYmd(d: Date | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Call at use time, never cache at module load, or "today" freezes when midnight passes in an open tab.
export function todayISODate(): string {
  return toYmd(new Date());
}

// True once both dates are filled in and end isn't strictly after start.
export function isDateRangeInvalid(startDate: string, endDate: string): boolean {
  return !!startDate && !!endDate && endDate <= startDate;
}

// Attendance sessions lock 24 hours after creation, teachers lose edit access, admins keep an override path.
export function isLockedAfter24Hours(createdAt: string | null | undefined): boolean {
  return !!createdAt && Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000;
}

type DateInput = string | Date | null | undefined;

// Most engines have no en-LK data and silently fall back to US month-first dates; en-GB gives the day-first order Sri Lanka uses.
function resolveLocale(tag: string, fallback: string): string {
  return new Intl.DateTimeFormat(tag).resolvedOptions().locale === tag ? tag : fallback;
}

const LOCALES: Record<string, string> = {
  en: resolveLocale("en-LK", "en-GB"),
  si: resolveLocale("si-LK", "si"),
  ta: resolveLocale("ta-LK", "ta"),
};

let locale = LOCALES.en;

// Called by the language switcher so dates follow the UI language.
export function setDateLocale(lang: string) {
  locale = LOCALES[lang] ?? LOCALES.en;
}

export function getDateLocale() {
  return locale;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parses a YYYY-MM-DD string as a local date; returns undefined for anything else.
export function fromYmd(input: string | null | undefined): Date | undefined {
  return input ? toDate(input) ?? undefined : undefined;
}

function toDate(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const dateOnly = DATE_ONLY.exec(input);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toLocaleDateString(locale) : "-";
}

export function formatDateTime(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toLocaleString(locale) : "-";
}

export function formatMonth(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toLocaleDateString(locale, { month: "short", year: "numeric" }) : "-";
}

export function formatLongDate(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "-";
}

export function formatShortDayMonth(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toLocaleDateString(locale, { month: "short", day: "numeric" }) : "-";
}

export function formatDayMonthYear(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" }) : "-";
}

export function formatTime(input: DateInput): string {
  const d = toDate(input);
  return d ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "-";
}

// "Today", "Yesterday" or a short date, for grouping feeds by day; the caller passes translated words.
export function formatDayGroup(input: DateInput, words: { today: string; yesterday: string }): string {
  const d = toDate(input);
  if (!d) return "-";
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return words.today;
  if (d.toDateString() === yesterday.toDateString()) return words.yesterday;
  return formatDayMonthYear(d);
}
