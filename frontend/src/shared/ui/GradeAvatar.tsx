import { gradeBand } from "@/shared/lib/gradeBand";

interface Props {
  gradeName: string | null | undefined;
  // Omit for a grade-only avatar.
  className?: string;
  size?: "sm" | "md" | "lg";
}

// "13" over "M1" for class 13-M1, or "G-13" for a grade on its own; tinted by school section.
export default function GradeAvatar({ gradeName, className = "", size = "md" }: Props) {
  const grade = gradeName?.match(/\d+/)?.[0] ?? "";
  const section = grade ? className.replace(new RegExp(`^${grade}(?!\\d)[-\\s]?`), "") : className;
  const gradeOnly = className === "";
  const main = grade ? (gradeOnly ? `G-${grade}` : grade) : (section || gradeName || "?").slice(0, 3);
  return (
    <span className={`os-grade-avatar os-grade-avatar--${size} os-grade-avatar--${gradeBand(gradeName)}${gradeOnly ? " is-grade-only" : ""}`} aria-hidden="true">
      <span className="os-grade-avatar__grade">{main}</span>
      {grade && section && <span className="os-grade-avatar__section">{section}</span>}
    </span>
  );
}
