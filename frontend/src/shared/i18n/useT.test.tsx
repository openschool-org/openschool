import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nContext, type I18nValue } from "@/shared/i18n/i18nContext";
import { useT } from "@/shared/i18n/useT";

describe("useT", () => {
  it("falls back to English outside a provider", () => {
    const { result } = renderHook(() => useT());
    expect(result.current.lang).toBe("en");
    expect(result.current.t("bell.unreadLabel", { count: 2 })).toBe("Notifications, 2 unread");
  });

  it("returns the provider's value", () => {
    const value: I18nValue = { lang: "si", setLang: () => {}, t: () => "translated" };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    );
    const { result } = renderHook(() => useT(), { wrapper });
    expect(result.current.lang).toBe("si");
    expect(result.current.t("bell.unreadLabel")).toBe("translated");
  });
});
