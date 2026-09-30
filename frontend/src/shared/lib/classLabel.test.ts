import { describe, expect, it } from "vitest";
import { classLabel } from "@/shared/lib/classLabel";

describe("classLabel", () => {
  it("drops the grade when the class name starts with its number", () => {
    expect(classLabel("Grade 13", "13-M1")).toBe("13-M1");
    expect(classLabel("Grade 6", "6A")).toBe("6A");
  });

  it("keeps the grade when the class name lacks it", () => {
    expect(classLabel("Grade 6", "A")).toBe("Grade 6 - A");
    expect(classLabel("Grade 1", "10-A")).toBe("Grade 1 - 10-A");
  });

  it("shows the class name alone without a grade", () => {
    expect(classLabel(null, "13-M1")).toBe("13-M1");
  });
});
