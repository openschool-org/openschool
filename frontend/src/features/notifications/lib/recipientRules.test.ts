import { describe, expect, it } from "vitest";
import { allowedRuleTypes, buildRule } from "@/features/notifications/lib/recipientRules";

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

describe("buildRule audiences", () => {
  it("narrows a class to students or guardians and keeps the plain class rule otherwise", () => {
    expect(buildRule("class", "c1", "13-M1", "students", "guardians")).toEqual({ type: "class", class_id: "c1", audience: "guardians", label: "13-M1 (Guardians)" });
    expect(buildRule("class", "c1", "13-M1", "students", "all")).toEqual({ type: "class", class_id: "c1", label: "13-M1" });
  });

  it("defaults a society rule to its members", () => {
    expect(buildRule("society", "s1", "Science Society", "students")).toEqual({ type: "society", society_id: "s1", audience: "students", label: "Science Society (Students)" });
    expect(buildRule("society", "s1", "Science Society", "students", "all").label).toBe("Science Society (Members and guardians)");
  });
});

describe("allowedRuleTypes", () => {
  const base = { full: false, classes: [], societies: [], grade_ids: [], grade_section_ids: [] };
  const cls = { id: "c", name: "13-M1", grade_name: "Grade 13", is_form_class: true };

  it("gives a plain class teacher their classes, people and teachers only", () => {
    expect(allowedRuleTypes({ ...base, classes: [cls] }, false)).toEqual(["class", "student", "guardian", "teacher"]);
  });

  it("adds society for its teacher in charge and grade rules for a grade head", () => {
    const types = allowedRuleTypes({ ...base, classes: [cls], societies: [{ id: "s", name: "Science" }], grade_ids: ["g"] }, false);
    expect(types).toEqual(["grade", "class", "subject", "society", "student", "guardian", "teacher"]);
  });

  it("gives admins every type", () => {
    expect(allowedRuleTypes({ ...base, full: true }, true)).toContain("grade_section");
  });
});
