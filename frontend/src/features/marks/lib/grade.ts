// Sri Lankan O/L and A/L letter grades: A 75+, B 65+, C 50+, S 35+, F below 35.
export type GradeLetter = "A" | "B" | "C" | "S" | "F";

export function gradeLetter(percent: number): GradeLetter {
  if (percent >= 75) return "A";
  if (percent >= 65) return "B";
  if (percent >= 50) return "C";
  if (percent >= 35) return "S";
  return "F";
}

export interface MarkLike {
  marks: number | string | null;
  max_marks: number | string | null;
  is_absent: boolean;
}

// The API sends NUMERIC as a number or a string, so both are accepted.
export function markPercent(m: MarkLike): number | null {
  const marks = Number(m.marks);
  const max = Number(m.max_marks);
  if (m.is_absent || !Number.isFinite(marks) || !Number.isFinite(max) || max <= 0) return null;
  return (marks / max) * 100;
}

// Mean percentage of the marks that count (absent ones are left out); null when none do.
export function averagePercent(marks: MarkLike[]): number | null {
  const values = marks.map(markPercent).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
