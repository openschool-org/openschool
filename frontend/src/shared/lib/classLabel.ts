// "13-M1" already says Grade 13, so the grade is added only when the class name lacks its number.
export function classLabel(gradeName: string | null | undefined, className: string): string {
  const gradeNumber = gradeName?.match(/\d+/)?.[0];
  if (!gradeName || (gradeNumber && new RegExp(`^${gradeNumber}(?!\\d)`).test(className.trim()))) return className;
  return `${gradeName} - ${className}`;
}
