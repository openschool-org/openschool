import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ProposalSection from "@/features/workflows/components/ProposalSection";
import type { Section } from "@/features/workflows/api/workflows";

const subjects = [{ value: "music", label: "Music" }, { value: "art", label: "Art" }];

afterEach(cleanup);

describe("ProposalSection", () => {
  it("renders one editable select per choice slot and sends the change", () => {
    const section: Section = {
      key: "choices", title: "Choices",
      columns: [{ key: "name", label: "Name", type: "text", editable: false }, { key: "g:1:1", label: "Basket 1", type: "select", editable: true, options: subjects }],
      rows: [{ id: "s1", cells: { name: "Nimal", "g:1:1": "" }, reason: "No choice recorded yet." }],
    };
    const onEdit = vi.fn();
    render(<ProposalSection section={section} editable onEdit={onEdit} busyRowId={null} />);
    fireEvent.change(screen.getByLabelText("Basket 1: Nimal"), { target: { value: "art" } });
    expect(onEdit).toHaveBeenCalledWith("s1", { "g:1:1": "art" });
    expect(screen.getByText("No choice recorded yet.")).toBeTruthy();
  });

  it("says so when a section has no rows", () => {
    render(<ProposalSection section={{ key: "form_teachers", title: "Form teachers", columns: [], rows: [] }} editable onEdit={() => {}} busyRowId={null} />);
    expect(screen.getByText("Nothing to show here for this run.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
