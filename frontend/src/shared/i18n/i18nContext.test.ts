import { describe, expect, it } from "vitest";
import { LANGUAGES, interpolate, isLang } from "@/shared/i18n/i18nContext";

describe("isLang", () => {
  it("accepts the supported languages", () => {
    expect(LANGUAGES.map((l) => l.value).every(isLang)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of ["fr", "", null, undefined, 1, "EN"]) expect(isLang(value)).toBe(false);
  });
});

describe("interpolate", () => {
  it("returns the template unchanged without vars", () => {
    expect(interpolate("Hello {name}")).toBe("Hello {name}");
  });

  it("fills known placeholders, including numbers", () => {
    expect(interpolate("{count} unread for {name}", { count: 3, name: "Nimal" })).toBe("3 unread for Nimal");
  });

  it("leaves unknown placeholders as they are", () => {
    expect(interpolate("Hi {name} {missing}", { name: "Ann" })).toBe("Hi Ann {missing}");
  });
});
