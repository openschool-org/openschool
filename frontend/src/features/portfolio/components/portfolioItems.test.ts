import { describe, expect, it } from "vitest";
import { groupPortfolio } from "@/features/portfolio/components/portfolioItems";

const words = { prefectRank: (r: string) => (r === "head" ? "Head Prefect" : r), societyRole: (r: string) => r, category: (c: string) => c };

describe("groupPortfolio", () => {
  it("groups by year newest first, puts prefect first and drops a duplicate Head Prefect role", () => {
    const years = groupPortfolio(
      {
        prefects: [
          { id: "p1", academic_year_id: "y26", rank: "head", created_at: null, academic_year_label: "2026" },
          { id: "p0", academic_year_id: "y25", rank: "senior", created_at: null, academic_year_label: "2025" },
        ],
        societies: [],
        leadership: [{ id: "l1", student_id: "s", academic_year_id: "y26", title: "Head Prefect", scope: null, created_at: null }],
        activities: [{ id: "a1", student_id: "s", academic_year_id: "y26", category: "sport", name: "Cricket", role: "Vice captain", achievement: null, created_at: null }],
        awards: [],
      },
      {},
      words,
    );
    expect(years.map((y) => y.label)).toEqual(["2026", "2025"]);
    expect(years[0].items.map((i) => i.kind)).toEqual(["prefect", "activity"]);
    expect(years[0].items[1].detail).toBe("Vice captain");
  });
});
