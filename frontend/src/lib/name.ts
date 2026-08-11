// Splits a stored `full_name` back into given/family name for an edit form.
// Lossy for any name with irregular spacing or a multi-word given name —
// there's no way to recover that distinction from a single joined string —
// but at least this is the one shared implementation instead of two
// separately-maintained copies (StudentDetail.tsx, TeacherDetail.tsx).
export function splitFullName(fullName: string): { given_name: string; family_name: string } {
  const [given, ...rest] = fullName.trim().split(/\s+/);
  return { given_name: given ?? "", family_name: rest.join(" ") };
}
