import { describe, expect, it } from "vitest";
import { buildRule } from "@/features/notifications/lib/recipientRules";

describe("buildRule", () => {
  it("sends the id under the rule's own field", () => {
    expect(buildRule("class", "c1", "Grade 6 - A", "students")).toEqual({ type: "class", class_id: "c1", label: "Grade 6 - A" });
    expect(buildRule("teacher", "t1", undefined, "students")).toEqual({ type: "teacher", teacher_id: "t1", label: "Teacher" });
  });

  it("labels a subject rule with its audience", () => {
    expect(buildRule("subject", "s1", "Maths", "teachers")).toEqual({ type: "subject", subject_id: "s1", subject_audience: "teachers", label: "Maths (Teachers)" });
    expect(buildRule("subject", "s1", undefined, "students").label).toBe("Subject (Students)");
  });
});
