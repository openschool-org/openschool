// Sri Lankan school sections: primary 1-5, junior 6-9, O/L 10-11, A/L 12-13.
function band(grade: number): string {
  if (grade <= 5) return "primary";
  if (grade <= 9) return "junior";
  if (grade <= 11) return "ol";
  return "al";
}

interface Props {
  gradeName: string | null | undefined;
  // Omit for a grade-only avatar.
  className?: string;
  size?: "sm" | "md" | "lg";
}

// Grade number with the class section under it ("13" over "M1" for 13-M1), tinted by school section.
export default function GradeAvatar({ gradeName, className = "", size = "md" }: Props) {
  const grade = gradeName?.match(/\d+/)?.[0] ?? "";
  const section = grade ? className.replace(new RegExp(`^${grade}(?!\\d)[-\\s]?`), "") : className;
  const main = grade || (section || gradeName || "?").slice(0, 3);
  return (
    <span className={`os-grade-avatar os-grade-avatar--${size} os-grade-avatar--${grade ? band(Number(grade)) : "none"}`} aria-hidden="true">
      <span className="os-grade-avatar__grade">{main}</span>
      {grade && section && <span className="os-grade-avatar__section">{section}</span>}
    </span>
  );
}
