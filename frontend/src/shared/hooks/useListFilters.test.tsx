import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useListFilters } from "@/shared/hooks/useListFilters";

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={["/list?grade=9"]}>{children}</MemoryRouter>;
const plain = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

describe("useListFilters", () => {
  it("tracks active keys and clears one or all", () => {
    const { result } = renderHook(() => useListFilters({ query: "", grade: "" }), { wrapper: plain });
    act(() => result.current.set("grade", "10"));
    expect(result.current.activeKeys).toEqual(["grade"]);
    act(() => result.current.set("query", "ann"));
    expect(result.current.hasActive).toBe(true);
    act(() => result.current.clear("grade"));
    expect(result.current.filters).toEqual({ query: "ann", grade: "" });
    act(() => result.current.clear());
    expect(result.current.hasActive).toBe(false);
  });

  it("debounces the search value", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useListFilters({ query: "" }, { debounceMs: 100 }), { wrapper: plain });
    act(() => result.current.set("query", "abc"));
    expect(result.current.debouncedSearch).toBe("");
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.debouncedSearch).toBe("abc");
    vi.useRealTimers();
  });

  it("reads initial values from the URL and writes changes back", () => {
    const { result } = renderHook(() => ({ f: useListFilters({ query: "", grade: "" }), loc: useLocation() }), { wrapper });
    expect(result.current.f.filters.grade).toBe("9");
    act(() => result.current.f.set("query", "ann"));
    expect(result.current.loc.search).toBe("?grade=9&query=ann");
    act(() => result.current.f.clear());
    expect(result.current.loc.search).toBe("");
  });
});
