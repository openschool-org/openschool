import { useState } from "react";
import {
  Button,
  PasswordInput,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { useChangePassword } from "../../queries/useAuth";
import { getErrorMessage } from "../../lib/errorMessage";

export default function ChangePasswordModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const changePassword = useChangePassword();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const canSubmit = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = () => {
    if (!canSubmit) return;
    changePassword.mutate(newPassword, { onSuccess: () => setDone(true) });
  };

  return (
    <ComposedModal open size="sm" onClose={onClose}>
      <ModalHeader title="Change password" />
      <ModalBody>
        {done ? (
          <InlineNotification
            kind="success"
            title="Password updated"
            subtitle="Use your new password the next time you sign in."
            lowContrast
            hideCloseButton
            style={{ maxWidth: "100%" }}
          />
        ) : (
          <>
            {changePassword.isError && (
              <InlineNotification
                kind="error"
                title="Could not update password"
                subtitle={getErrorMessage(
                  changePassword.error,
                  "Please try again.",
                )}
                lowContrast
                hideCloseButton
                style={{ marginBottom: "1rem", maxWidth: "100%" }}
              />
            )}
            <div style={{ display: "grid", gap: "1rem" }}>
              <PasswordInput
                id="change-password-new"
                labelText="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                invalid={newPassword.length > 0 && newPassword.length < 8}
                invalidText="Must be at least 8 characters."
              />
              <PasswordInput
                id="change-password-confirm"
                labelText="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                invalid={
                  confirmPassword.length > 0 && confirmPassword !== newPassword
                }
                invalidText="Passwords do not match."
              />
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {done ? (
          <Button kind="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button kind="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              kind="primary"
              onClick={handleSubmit}
              disabled={!canSubmit || changePassword.isPending}
            >
              {changePassword.isPending ? "Saving…" : "Save"}
            </Button>
          </>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
