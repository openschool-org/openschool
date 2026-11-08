import { useState } from "react";
import { Alert } from "antd";
import TextField from "@/shared/ui/TextField";
import { useProvisionGuardianLogin } from "@/features/guardians/queries/useGuardians";
import type { GuardianWithPrimary } from "@/features/guardians/api/guardian";
import FormModal from "@/shared/ui/FormModal";
import { displayName } from "@/shared/lib/name";

// Names come from the guardian record, so only the username is asked for here.
export default function ProvisionLoginModal({
  studentId,
  guardian,
  onClose,
}: {
  studentId: string;
  guardian: GuardianWithPrimary;
  onClose: () => void;
}) {
  const provision = useProvisionGuardianLogin(studentId);
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const name = displayName(guardian);
  const isValid = username.trim().length > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    provision.mutate({ guardianId: guardian.id, data: { username: username.trim() } }, { onSuccess: onClose });
  };

  return (
    <FormModal
      open
      title={`Set up portal login - ${name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      isPending={provision.isPending}
      submitDisabled={!isValid || !guardian.email}
      submitLabel="Create login"
      pendingLabel="Creating…"
      isError={provision.isError}
      error={provision.error}
      errorFallback="Failed to create login"
    >
      {!guardian.email && (
        <Alert
          type="warning"
          showIcon
          title="No email on file"
          description="This guardian needs an email address before a login can be provisioned. Edit their details first."
          className="os-mb-4"
        />
      )}
      <Alert
        type="info"
        showIcon
        title="One-time password"
        description={`${name}'s NIC number on file becomes their initial portal password. They'll be prompted to change it on first sign-in.`}
        className="os-mb-4"
      />
      <TextField
        id="guardian-login-username"
        label="Username"
        helperText="What this guardian signs in with - separate from their email. Their name is taken from their guardian details."
        value={username}
        onChange={(v) => setUsername(v)}
        onBlur={() => setTouched(true)}
        invalid={touched && !username.trim()}
        invalidText="Required."
      />
    </FormModal>
  );
}
