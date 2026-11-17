import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SelectField from "@/shared/ui/SelectField";
import { expectNoA11yViolations } from "@/shared/testing/a11y";

afterEach(cleanup);

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("SelectField", () => {
  it("shows the label and the selected option", () => {
    render(<SelectField id="pick" label="Pick one" value="b" onChange={() => {}} options={options} />);
    expect(screen.getByText("Pick one")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("shows the placeholder when the value is empty", () => {
    render(<SelectField id="pick" label="Pick one" value="" onChange={() => {}} options={options} placeholder="Choose" />);
    expect(screen.getByText("Choose")).toBeTruthy();
  });

  it("shows the error text only when invalid", () => {
    const { rerender } = render(
      <SelectField id="pick" label="Pick one" value="" onChange={() => {}} options={options} invalidText="Required" />,
    );
    expect(screen.queryByText("Required")).toBeNull();
    rerender(<SelectField id="pick" label="Pick one" value="" onChange={() => {}} options={options} invalid invalidText="Required" />);
    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("has no accessibility violations with a hidden label", async () => {
    const { container } = render(<SelectField id="pick" label="Year" hideLabel value="a" onChange={() => {}} options={options} />);
    await expectNoA11yViolations(container);
  });
});
