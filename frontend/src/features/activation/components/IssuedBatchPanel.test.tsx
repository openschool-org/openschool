import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import IssuedBatchPanel from "@/features/activation/components/IssuedBatchPanel";
import type { GeneratedBatch, IssuedCode } from "@/features/activation/api/activation";

vi.mock("@/features/school/queries/useSchool", () => ({ useSchool: () => ({ data: { name: "Royal College" } }) }));

const code = (name: string, cls: string, value: string): IssuedCode => ({
  name, detail: "", code: value, index_number: "1", class_name: cls, grade_name: "Grade 6", grade_order: 6, form_teacher: "",
});
const batch: GeneratedBatch = {
  batch_id: "b", role: "student", expires_at: "2026-10-14T00:00:00Z",
  codes: [code("Amal", "6-A", "AAAAA-11111"), code("Bimali", "6-B", "BBBBB-22222")],
};

const sheetCodes = () => [...document.querySelectorAll(".os-slip-sheet .os-slip__code")].map((e) => e.textContent);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("IssuedBatchPanel printing", () => {
  it("keeps every code on the print sheet while shown, so Ctrl+P prints the codes too", () => {
    render(<IssuedBatchPanel batch={batch} onDone={() => {}} />);
    expect(document.body.classList.contains("os-print-slips")).toBe(true);
    expect(sheetCodes()).toEqual(["AAAAA-11111", "BBBBB-22222"]);
  });

  it("prints only the chosen class, with its codes already on the sheet when the dialog opens", () => {
    let atPrint: (string | null)[] = [];
    vi.spyOn(window, "print").mockImplementation(() => { atPrint = sheetCodes(); });
    render(<IssuedBatchPanel batch={batch} onDone={() => {}} />);
    // The summary table on screen, not the print sheet (jsdom does not apply the print CSS).
    const summary = document.querySelector<HTMLElement>("table.os-table")!;
    const row = within(summary).getByText("Grade 6 · 6-B").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: /Print/ }));
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(atPrint).toEqual(["BBBBB-22222"]);
  });

  it("stops taking over printing once the codes are closed", () => {
    const { unmount } = render(<IssuedBatchPanel batch={batch} onDone={() => {}} />);
    unmount();
    expect(document.body.classList.contains("os-print-slips")).toBe(false);
  });
});
