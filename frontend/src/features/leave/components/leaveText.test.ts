import { describe, expect, it } from "vitest";
import { leaveDays } from "@/features/leave/components/leaveText";

describe("leaveDays", () => {
  it("counts days, and names short leave instead", () => {
    expect(leaveDays({ leave_type: "casual", days: 0.5 })).toBe("0.5 days");
    expect(leaveDays({ leave_type: "sick", days: 1 })).toBe("1 day");
    expect(leaveDays({ leave_type: "short", days: 0 })).toBe("Short");
  });
});
