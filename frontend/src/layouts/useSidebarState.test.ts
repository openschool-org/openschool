import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSidebarState } from "@/layouts/useSidebarState";

afterEach(() => localStorage.clear());

describe("useSidebarState", () => {
  it("toggles between expanded and rail on desktop and remembers it", () => {
    const { result } = renderHook(() => useSidebarState(false, "/"));
    expect(result.current.open).toBe(true);
    expect(result.current.rail).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.rail).toBe(true);
    expect(localStorage.getItem("os.sidenav.rail")).toBe("1");

    const reloaded = renderHook(() => useSidebarState(false, "/"));
    expect(reloaded.result.current.rail).toBe(true);
  });

  it("opens the drawer and closes it on Escape", () => {
    const { result } = renderHook(() => useSidebarState(true, "/"));
    expect(result.current.open).toBe(false);
    expect(result.current.rail).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.drawerOpen).toBe(true);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); });
    expect(result.current.drawerOpen).toBe(false);
  });

  it("closes the drawer when the route changes", () => {
    const { result, rerender } = renderHook(({ path }) => useSidebarState(true, path), { initialProps: { path: "/a" } });
    act(() => result.current.toggle());
    expect(result.current.drawerOpen).toBe(true);
    rerender({ path: "/b" });
    expect(result.current.drawerOpen).toBe(false);
  });
});
