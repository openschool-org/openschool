import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Field from "@/shared/ui/Field";

afterEach(cleanup);

const classes = (el: Element | null) => [...(el?.classList ?? [])];

describe("Field", () => {
  it("links the label to the control", () => {
    render(<Field id="email" label="Email"><input id="email" /></Field>);
    expect(screen.getByLabelText("Email")).toBe(document.getElementById("email"));
  });

  it("shows the error as an alert and marks the field invalid", () => {
    const { container } = render(
      <Field id="email" label="Email" error="Required" helper="Work address"><input id="email" /></Field>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Required");
    expect(alert.id).toBe("email-error");
    expect(screen.queryByText("Work address")).toBeNull();
    expect(classes(container.firstElementChild)).toEqual(["os-field", "is-invalid"]);
  });

  it("shows helper text when there is no error", () => {
    render(<Field id="x" helper="Optional"><input id="x" /></Field>);
    expect(classes(screen.getByText("Optional"))).toEqual(["os-field__helper"]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps a hidden label for screen readers and adds custom classes", () => {
    const { container } = render(<Field id="q" label="Search" hideLabel className="extra"><input id="q" /></Field>);
    expect(classes(screen.getByText("Search"))).toEqual(["os-sr-only"]);
    expect(classes(container.firstElementChild)).toEqual(["os-field", "extra"]);
  });
});
