import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import UnsavedChangesModal from "@/shared/ui/UnsavedChangesModal";
import { expectNoA11yViolations } from "@/shared/testing/a11y";

describe("UnsavedChangesModal", () => {
  it("has no accessibility violations when open", async () => {
    render(<UnsavedChangesModal open onStay={() => {}} onLeave={() => {}} />);
    await expectNoA11yViolations(document.body);
  });
});
