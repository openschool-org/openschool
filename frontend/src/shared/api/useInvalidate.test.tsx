import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useInvalidate } from "@/shared/api/useInvalidate";

function setup() {
  const client = new QueryClient();
  const spy = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { spy, ...renderHook(() => useInvalidate(), { wrapper }) };
}

describe("useInvalidate", () => {
  it("invalidates every prefix it is given", () => {
    const { result, spy } = setup();
    result.current(["students"], ["classes", "detail"]);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, { queryKey: ["students"] });
    expect(spy).toHaveBeenNthCalledWith(2, { queryKey: ["classes", "detail"] });
  });

  it("does nothing without prefixes", () => {
    const { result, spy } = setup();
    result.current();
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps the same function between renders", () => {
    const { result, rerender } = setup();
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
