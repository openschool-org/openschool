import { describe, expect, it } from "vitest";
import { validateNewPassword } from "@/shared/auth/password";

const STRONG = "Ka9!mzQpwx";

describe("validateNewPassword", () => {
  it("accepts a strong password that matches its confirmation", () => {
    const r = validateNewPassword(STRONG, STRONG);
    expect(r.valid).toBe(true);
    expect(r.passwordError).toBeUndefined();
    expect(r.confirmError).toBeUndefined();
    expect(Object.values(r.criteria).every(Boolean)).toBe(true);
  });

  it("shows no errors for empty input", () => {
    const r = validateNewPassword("", "");
    expect(r.valid).toBe(false);
    expect(r.passwordError).toBeUndefined();
    expect(r.confirmError).toBeUndefined();
  });

  it.each([
    ["Ka9!mz", "Must be at least 10 characters."],
    ["Password123", "That password is too common. Choose something less guessable."],
    ["Xy!1abcdQz", "Avoid predictable sequences such as 1234 or abcd."],
    ["Xy!9zdcbaQ", "Avoid predictable sequences such as 1234 or abcd."],
    ["ka9!mzqpwx", "Add at least one uppercase letter."],
    ["KA9!MZQPWX", "Add at least one lowercase letter."],
    ["Ka!!mzQpwx", "Add at least one number."],
    ["Ka9xmzQpwx", "Add at least one special character."],
  ])("rejects %s", (password, message) => {
    const r = validateNewPassword(password, password);
    expect(r.valid).toBe(false);
    expect(r.passwordError).toBe(message);
  });

  it("reports the first failed rule in policy order", () => {
    expect(validateNewPassword("abcdefghij", "").passwordError).toBe("Avoid predictable sequences such as 1234 or abcd.");
    expect(validateNewPassword("kqzmwpxtrv", "").passwordError).toBe("Add at least one uppercase letter.");
  });

  it("flags a mismatched confirmation only once it is typed", () => {
    expect(validateNewPassword(STRONG, "").confirmError).toBeUndefined();
    expect(validateNewPassword(STRONG, "").valid).toBe(false);
    const r = validateNewPassword(STRONG, `${STRONG}x`);
    expect(r.confirmError).toBe("Passwords do not match.");
    expect(r.valid).toBe(false);
  });

  it("marks notCommon false for short, common and sequential passwords", () => {
    expect(validateNewPassword("Ka9!", "").criteria.notCommon).toBe(false);
    expect(validateNewPassword("password123", "").criteria.notCommon).toBe(false);
    expect(validateNewPassword("Zx!91234Qw", "").criteria.notCommon).toBe(false);
  });
});
