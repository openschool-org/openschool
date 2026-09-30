// Sri Lankan school sections: primary 1-5, junior 6-9, O/L 10-11, A/L 12-13.
function band(grade: number): string {
  if (grade <= 5) return "primary";
  if (grade <= 9) return "junior";
  if (grade <= 11) return "ol";
  return "al";
}

// The section name for a grade ("al" for Grade 13), or "none"; pairs with the os-grade-band--* classes.
export function gradeBand(gradeName: string | null | undefined): string {
  const grade = gradeName?.match(/\d+/)?.[0];
  return grade ? band(Number(grade)) : "none";
}
