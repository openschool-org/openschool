import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import WorkflowAgents from "@/features/workflows/components/WorkflowAgents";
import type { CatalogEntry } from "@/features/workflows/api/workflows";

const catalog: CatalogEntry[] = [
  {
    key: "teacher_allocation", group: "year_end", order: 6, title: "Teacher allocation", description: "Assigns a qualified teacher to every class and subject.",
    steps: [{ key: "allocate", title: "Allocate teachers", tool: "allocate_teachers", phase: "propose" }],
    tools: [{ name: "allocate_teachers", description: "Deterministic allocation.", mutates: false }],
    inputs: [],
    last_run: { id: "r1", state: "applied", summary: "Saved 12 subject teachers", created_at: "2026-09-26T08:00:00Z", applied_at: "2026-09-26T08:05:00Z" },
  },
  {
    key: "student_import", group: "setup", order: 0, title: "Import students", description: "Adds many students at once.",
    steps: [], tools: [], inputs: [],
  },
];

vi.mock("@/features/workflows/queries/useWorkflows", () => ({
  useWorkflowCatalog: () => ({ data: catalog, isLoading: false, isError: false, refetch: () => {} }),
}));

afterEach(cleanup);

describe("WorkflowAgents", () => {
  it("lists each workflow from the catalogue with its steps, last run and a link", () => {
    render(<MemoryRouter><WorkflowAgents /></MemoryRouter>);
    expect(screen.getByText("6. Teacher allocation")).toBeTruthy();
    expect(screen.getByText("Applied")).toBeTruthy();
    expect(screen.getByText("Deterministic allocation.", { exact: false })).toBeTruthy();
    expect(screen.getByText(/Saved 12 subject teachers/)).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /Open/ }).map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/year-end/teacher_allocation", "/students/import"]);
  });

  it("keeps setup tools out of the numbered year-end list", () => {
    render(<MemoryRouter><WorkflowAgents /></MemoryRouter>);
    expect(screen.getByText("Setup tools")).toBeTruthy();
    expect(screen.getByText("Import students")).toBeTruthy();
    expect(screen.queryByText(/0\. Import students/)).toBeNull();
  });
});
