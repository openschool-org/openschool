import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Boom(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText("fine")).toBeTruthy();
  });

  it("shows the full-page fallback by default", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(container.querySelector(".os-error-fallback--full")).not.toBeNull();
  });

  it("shows the page-level fallback for the route variant", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<ErrorBoundary variant="route"><Boom /></ErrorBoundary>);
    expect(screen.getByText("This page hit an error")).toBeTruthy();
    expect(container.querySelector(".os-error-fallback--full")).toBeNull();
  });
});
