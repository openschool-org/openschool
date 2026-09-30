// Sri Lankan names don't split into first and last. Records keep the full name, the name with
// initials (e.g. "H.A.H.E. Wickramasinghe") and an optional calling name (e.g. "Hasitha").

export interface PersonNameValues {
  full_name: string;
  name_with_initials: string;
  calling_name: string;
}

export const EMPTY_PERSON_NAMES: PersonNameValues = { full_name: "", name_with_initials: "", calling_name: "" };

function words(full: string): string[] {
  return full.replace(/\./g, ". ").split(/\s+/).filter(Boolean);
}

function initialOf(word: string): string {
  const letter = [...word].find((ch) => /\p{L}/u.test(ch));
  return letter ? letter.toUpperCase() : "";
}

// Mirrors backend internal/names.WithInitials: an initial for every word but the last, then the last word.
export function suggestNameWithInitials(full: string): string {
  const ws = words(full);
  if (ws.length === 0) return "";
  if (ws.length === 1) return ws[0];
  const initials = ws.slice(0, -1).map(initialOf).filter(Boolean).map((i) => `${i}.`).join("");
  const last = ws[ws.length - 1].replace(/\.$/, "");
  return initials ? `${initials} ${last}` : last;
}

// The short form for lists and printouts, falling back to the full name on older records.
export function displayName(person: { full_name: string; name_with_initials?: string | null }): string {
  return person.name_with_initials?.trim() || person.full_name;
}

// Up to two initials from a full name, for avatar placeholders.
export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
