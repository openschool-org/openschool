// toYmd formats a Date as local YYYY-MM-DD — the one shared implementation
// for what used to be ~10 near-identical copies across admin pages (see
// audit.md's "duplicated date logic" finding). Accepts `undefined` since
// several Carbon DatePicker `onChange` handlers receive a possibly-empty
// selection.
export function toYmd(d: Date | undefined): string {
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Always call this at render/use time, never cache its result in a
// module-level constant — a value computed once at module load goes stale
// the moment local midnight passes while the tab stays open (see audit.md
// M-9, where exactly that caused "today" to freeze on whatever date the
// page happened to first load).
export function todayISODate(): string {
  return toYmd(new Date());
}
