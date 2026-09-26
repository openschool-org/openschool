import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import WorkflowAgents from "@/features/workflows/components/WorkflowAgents";
import type { CatalogEntry } from "@/features/workflows/api/workflows";

const catalog: CatalogEntry[] = [
  {
    key: "teacher_allocation", order: 6, title: "Teacher allocation", description: "Assigns a qualified teacher to every class and subject.",
    steps: [{ key: "allocate", title: "Allocate teachers", tool: "allocate_teachers", phase: "propose" }],
    tools: [{ name: "allocate_teachers", description: "Deterministic allocation.", mutates: false }],
    inputs: [],
    last_run: { id: "r1", state: "applied", summary: "Saved 12 subject teachers", created_at: "2026-09-26T08:00:00Z", applied_at: "2026-09-26T08:05:00Z" },
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
    expect(screen.getByRole("link", { name: /Open/ }).getAttribute("href")).toBe("/year-end/teacher_allocation");
  });
});
