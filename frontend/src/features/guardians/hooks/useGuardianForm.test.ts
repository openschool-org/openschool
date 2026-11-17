import { describe, expect, it } from "vitest";
import { EMPTY_GUARDIAN_FORM, isGuardianFormValid } from "@/features/guardians/hooks/useGuardianForm";

const valid = { ...EMPTY_GUARDIAN_FORM, full_name: "Nimal Perera", phone: "0771234567", nic_number: "199012345678" };

describe("isGuardianFormValid", () => {
  it("accepts a complete form", () => {
    expect(isGuardianFormValid(valid)).toBe(true);
  });

  it("rejects a blank name, phone or NIC", () => {
    expect(isGuardianFormValid({ ...valid, full_name: "  " })).toBe(false);
    expect(isGuardianFormValid({ ...valid, phone: "" })).toBe(false);
    expect(isGuardianFormValid({ ...valid, nic_number: " " })).toBe(false);
  });

  it("rejects a phone that is not Sri Lankan", () => {
    expect(isGuardianFormValid({ ...valid, phone: "12345" })).toBe(false);
  });
});
