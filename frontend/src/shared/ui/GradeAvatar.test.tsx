import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import GradeAvatar from "@/shared/ui/GradeAvatar";

afterEach(cleanup);

const parts = (gradeName: string | null, className?: string) => {
  const { container } = render(<GradeAvatar gradeName={gradeName} className={className} />);
  const root = container.firstElementChild!;
  return [root.className, ...[...root.children].map((c) => c.textContent)];
};

describe("GradeAvatar", () => {
  it("shows the grade over the section, without repeating the grade", () => {
    expect(parts("Grade 13", "13-M1")).toEqual(["os-grade-avatar os-grade-avatar--md os-grade-avatar--al", "13", "M1"]);
    expect(parts("Grade 6", "6A")).toEqual(["os-grade-avatar os-grade-avatar--md os-grade-avatar--junior", "6", "A"]);
  });

  it("keeps a class name that does not start with the grade", () => {
    expect(parts("Grade 1", "10-A")).toEqual(["os-grade-avatar os-grade-avatar--md os-grade-avatar--primary", "1", "10-A"]);
  });

  it("shows only the grade when no class is given", () => {
    expect(parts("Grade 11")).toEqual(["os-grade-avatar os-grade-avatar--md os-grade-avatar--ol", "11"]);
  });
});
