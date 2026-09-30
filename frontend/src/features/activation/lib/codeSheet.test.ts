import { describe, expect, it } from "vitest";
import { batchToCsv } from "@/features/activation/lib/codeSheet";
import { closesAtFromYmd, opensAtFromYmd, ymdFromClosesAt, ymdFromOpensAt } from "@/features/activation/lib/window";

describe("batchToCsv", () => {
  it("quotes cells and defuses formula prefixes", () => {
    const csv = batchToCsv({
      batch_id: "b",
      role: "student",
      expires_at: "2026-10-14T00:00:00Z",
      codes: [{ name: '=HYPERLINK("x")', detail: "6-A", code: "ABCDE-FGHJK" }],
    });
    const [header, row] = csv.trim().split("\r\n");
    expect(header).toBe('"Name","Class","Activation code","Expires"');
    expect(row.startsWith(`"'=HYPERLINK(""x"")","6-A","ABCDE-FGHJK"`)).toBe(true);
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
