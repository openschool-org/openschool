import { useState } from "react";
import { Alert, Button, Form, Input, Modal } from "antd";
import { useChangePassword } from "@/features/auth/queries/useAuth";
import { validateNewPassword } from "@/shared/auth/password";
import { getErrorMessage } from "@/shared/api/errors";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const changePassword = useChangePassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const { valid, criteria, passwordError, confirmError } = validateNewPassword(password, confirm);
  const criteriaMet = Object.values(criteria).every(Boolean);

  const handleSubmit = () => {
    if (valid) changePassword.mutate(password, { onSuccess: () => setDone(true) });
  };

  return (
    <Modal
      open
      title="Change password"
      width={560}
      className="os-pw-modal"
      onCancel={onClose}
      footer={
        done ? (
          <Button size="large" type="primary" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button size="large" onClick={onClose}>Cancel</Button>
            <Button size="large" type="primary" onClick={handleSubmit} disabled={!valid} loading={changePassword.isPending}>
              Save
            </Button>
          </>
        )
      }
    >
      {done ? (
        <Alert type="success" showIcon title="Password updated" description="Use your new password the next time you sign in." />
      ) : (
        <Form layout="vertical" onFinish={handleSubmit}>
          {changePassword.isError && (
            <Alert
              type="error"
              showIcon
              className="os-mb-4"
              title="Could not update password"
              description={getErrorMessage(changePassword.error, "Please try again.")}
            />
          )}
          {/* The validator reports the next thing to fix, one message at a time, instead of a checklist. */}
          <Form.Item
            label="New password"
            validateStatus={passwordError ? "error" : password && criteriaMet ? "success" : undefined}
            help={passwordError ?? (password && criteriaMet ? "Strong password" : undefined)}
          >
            <Input.Password size="large" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Form.Item>
          {/* Match feedback appears only once the confirm field has input. */}
          <Form.Item
            label="Confirm new password"
            validateStatus={confirmError ? "error" : confirm && confirm === password ? "success" : undefined}
            help={confirmError ?? (confirm && confirm === password ? "Passwords match" : undefined)}
          >
            <Input.Password size="large" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
