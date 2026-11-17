import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeOutlined, TableOutlined } from "@ant-design/icons";
import PortalShell from "@/layouts/PortalShell";
import { ToastProvider } from "@/shared/ui/toast/ToastContext";
import type { NavGroup } from "@/layouts/nav/types";

// The header pulls in auth, search and notifications; the shell itself is what is under test.
vi.mock("@/layouts/AppHeaderChrome", () => ({
  AppHeaderBrand: () => null,
  AppHeaderActions: () => null,
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const nav: NavGroup[] = [
  {
    label: "Overview",
    items: [{ path: "/", label: "Dashboard", Icon: HomeOutlined, exact: true }],
  },
  {
    label: "Academics",
    items: [{ path: "/timetable", label: "Timetable", Icon: TableOutlined }],
  },
];

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<PortalShell navGroups={nav} />}>
              <Route path="/" element={<p>home page</p>} />
              <Route path="/timetable" element={<p>timetable page</p>} />
              <Route path="/timetable/:id" element={<p>one timetable</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("PortalShell", () => {
  it("renders the page inside the shell and titles the tab from the nav", () => {
    renderAt("/timetable");
    expect(screen.getByText("timetable page")).toBeTruthy();
    expect(document.title).toBe("Timetable · OpenSchool");
  });

  it("collapses the sidebar to a rail and back", () => {
    renderAt("/");
    const toggle = screen.getByRole("button", { expanded: true });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      document.querySelector(".os-layout__sidebar.is-rail"),
    ).not.toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows breadcrumbs on a page nested under a nav item", () => {
    renderAt("/timetable/123");
    expect(screen.getByText("one timetable")).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: /breadcrumb/i }),
    ).toBeTruthy();
  });
});
