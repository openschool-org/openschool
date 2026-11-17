import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { useOpenParam } from "@/shared/hooks/useOpenParam";

const at = (url: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;

describe("useOpenParam", () => {
  it("selects the row named in ?open= and keeps other params on close", () => {
    const { result } = renderHook(() => ({ o: useOpenParam(), loc: useLocation() }), { wrapper: at("/guardians?query=ann&open=g1") });
    expect(result.current.o.selectedId).toBe("g1");
    act(() => result.current.o.close());
    expect(result.current.o.selectedId).toBeNull();
    expect(result.current.loc.search).toBe("?query=ann");
  });

  it("selects a clicked row without touching the URL", () => {
    const { result } = renderHook(() => ({ o: useOpenParam(), loc: useLocation() }), { wrapper: at("/guardians") });
    act(() => result.current.o.select("g2"));
    expect(result.current.o.selectedId).toBe("g2");
    act(() => result.current.o.close());
    expect(result.current.loc.search).toBe("");
  });
});
