import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import WorkflowInputs from "@/features/workflows/components/WorkflowInputs";
import { expectNoA11yViolations } from "@/shared/testing/a11y";

afterEach(cleanup);

describe("WorkflowInputs csv field", () => {
  const field = { key: "csv", label: "Students CSV", type: "csv" as const, required: true, template: "index_number,full_name\n1,A\n", help: "One row per student." };

  it("takes pasted text and counts the rows after the header", async () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<WorkflowInputs fields={[field]} values={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Students CSV"), { target: { value: "index_number,full_name\n1,A\n2,B" } });
    expect(onChange).toHaveBeenCalledWith("csv", "index_number,full_name\n1,A\n2,B");
    rerender(<WorkflowInputs fields={[field]} values={{ csv: "index_number,full_name\n1,A\n2,B" }} onChange={onChange} />);
    expect(screen.getByText("2 rows after the header")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download template" })).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it("offers no template button when the backend sends none", () => {
    render(<WorkflowInputs fields={[{ ...field, template: undefined }]} values={{}} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Download template" })).toBeNull();
  });
});
