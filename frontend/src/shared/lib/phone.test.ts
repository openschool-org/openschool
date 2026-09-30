import { describe, expect, it } from "vitest";
import { isValidSriLankanPhone, normalizeSriLankanPhone } from "@/shared/lib/phone";

describe("normalizeSriLankanPhone", () => {
  it("accepts the same forms as the server", () => {
    expect(normalizeSriLankanPhone("0777356618")).toBe("0777356618");
    expect(normalizeSriLankanPhone("+94777256678")).toBe("0777256678");
    expect(normalizeSriLankanPhone("94777256678")).toBe("0777256678");
    expect(normalizeSriLankanPhone("777356618")).toBe("0777356618");
    expect(normalizeSriLankanPhone("077 735 6618")).toBe("0777356618");
    expect(normalizeSriLankanPhone("0094-77-725-6678")).toBe("0777256678");
    expect(normalizeSriLankanPhone("")).toBe("");
  });

  it("rejects anything else", () => {
    for (const bad of ["12345", "07773566181", "+1 555 123 4567", "7.77356618E+08", "077+7356618"]) {
      expect(isValidSriLankanPhone(bad)).toBe(false);
    }
  });
});
