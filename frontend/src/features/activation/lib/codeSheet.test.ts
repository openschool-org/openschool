import { describe, expect, it } from "vitest";
import type { GeneratedBatch, IssuedCode } from "@/features/activation/api/activation";
import { batchToCsv, groupByClass } from "@/features/activation/lib/codeSheet";
import { closesAtFromYmd, opensAtFromYmd, ymdFromClosesAt, ymdFromOpensAt } from "@/features/activation/lib/window";

const code = (name: string, grade: string, order: number, cls: string, extra: Partial<IssuedCode> = {}): IssuedCode => ({
  name, detail: "", code: `C-${name}`, class_name: cls, grade_name: grade, grade_order: order, form_teacher: "", ...extra,
});

const batch = (codes: IssuedCode[]): GeneratedBatch => ({ batch_id: "b", role: "student", expires_at: "2026-10-14T00:00:00Z", codes });

describe("groupByClass", () => {
  it("orders classes by grade then name, names within a class, and unplaced last", () => {
    const groups = groupByClass(batch([
      code("Zara", "Grade 10", 10, "10-A"),
      code("Nimali", "Grade 6", 6, "6-B"),
      code("Amal", "Grade 6", 6, "6-A"),
      code("Kasun", "Grade 6", 6, "6-A", { form_teacher: "Mrs. Silva" }),
      code("Loose", "", 0, ""),
    ]));
    expect(groups.map((g) => g.title)).toEqual(["6-A", "6-B", "10-A", "Not in a class"]);
    expect(groups[0].codes.map((c) => c.name)).toEqual(["Amal", "Kasun"]);
  });
});

describe("batchToCsv", () => {
  it("lists class columns and defuses formula prefixes", () => {
    const csv = batchToCsv(batch([code('=HYPERLINK("x")', "Grade 6", 6, "6-A", { index_number: "2026/0001", form_teacher: "Mrs. Silva" })]));
    const [header, row] = csv.trim().split("\r\n");
    expect(header).toBe('"Grade","Class","Form teacher","Name","Index number","Activation code","Expires"');
    expect(row.startsWith(`"Grade 6","6-A","Mrs. Silva","'=HYPERLINK(""x"")","2026/0001"`)).toBe(true);
  });
});

describe("activation window dates", () => {
  it("round-trips the inclusive closing day", () => {
    expect(ymdFromOpensAt(opensAtFromYmd("2026-10-01"))).toBe("2026-10-01");
    expect(ymdFromClosesAt(closesAtFromYmd("2026-10-31"))).toBe("2026-10-31");
    expect(new Date(closesAtFromYmd("2026-10-31")!) > new Date(opensAtFromYmd("2026-10-31")!)).toBe(true);
    expect(opensAtFromYmd("")).toBeNull();
  });
});
