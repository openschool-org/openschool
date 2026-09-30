import { useState } from "react";
import { TextInput, InlineNotification } from "@carbon/react";
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
        <InlineNotification
          kind="warning"
          title="No email on file"
          subtitle="This guardian needs an email address before a login can be provisioned. Edit their details first."
          lowContrast
          hideCloseButton className="os-mb-4 os-max-w-full"
        />
      )}
      <InlineNotification
        kind="info"
        title="One-time password"
        subtitle={`${name}'s NIC number on file becomes their initial portal password. They'll be prompted to change it on first sign-in.`}
        lowContrast
        hideCloseButton className="os-mb-4 os-max-w-full"
      />
      <TextInput
        id="guardian-login-username"
        labelText="Username"
        helperText="What this guardian signs in with - separate from their email. Their name is taken from their guardian details."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onBlur={() => setTouched(true)}
        invalid={touched && !username.trim()}
        invalidText="Required."
      />
    </FormModal>
  );
}
