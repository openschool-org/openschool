import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import { ToastProvider } from "@/shared/ui/toast/ToastContext";
import { expectNoA11yViolations } from "@/shared/testing/a11y";

const mutation = { isPending: false, isSuccess: false, reset: () => {} };

describe("ConfirmDeleteModal", () => {
  it("has no accessibility violations when open", async () => {
    render(
      <ToastProvider>
        <ConfirmDeleteModal
          open
          title="Delete student"
          description="Delete Jane Doe? This cannot be undone."
          subject="Student"
          mutation={mutation}
          onClose={() => {}}
          onConfirm={() => {}}
        />
      </ToastProvider>,
    );
    await expectNoA11yViolations(document.body);
  });
});
