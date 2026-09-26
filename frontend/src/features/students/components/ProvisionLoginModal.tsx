import { useState } from "react";
import { TextInput, InlineNotification } from "@carbon/react";
import { useProvisionGuardianLogin } from "@/features/guardians/queries/useGuardians";
import type { GuardianWithPrimary } from "@/features/guardians/api/guardian";
import FormModal from "@/shared/ui/FormModal";
import { splitFullName } from "@/shared/lib/name";

const EMPTY_LOGIN_FORM = { given_name: "", family_name: "", username: "" };

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
  const [form, setForm] = useState(() => ({ ...EMPTY_LOGIN_FORM, ...splitFullName(guardian.full_name) }));
  const [touched, setTouched] = useState<Record<keyof typeof EMPTY_LOGIN_FORM, boolean>>({
    given_name: false,
    family_name: false,
    username: false,
  });

  const isValid =
    form.given_name.trim().length > 0 &&
    form.family_name.trim().length > 0 &&
    form.username.trim().length > 0;

  const handleSubmit = () => {
    setTouched({ given_name: true, family_name: true, username: true });
    if (!isValid) return;
    provision.mutate(
      {
        guardianId: guardian.id,
        data: {
          given_name: form.given_name.trim(),
          family_name: form.family_name.trim(),
          username: form.username.trim(),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <FormModal
      open
      title={`Set up portal login - ${guardian.full_name}`}
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
        subtitle={`${guardian.full_name}'s NIC number on file becomes their initial portal password. They'll be prompted to change it on first sign-in.`}
        lowContrast
        hideCloseButton className="os-mb-4 os-max-w-full"
      />
      <div className="os-grid os-grid-cols-2 os-gap-4">
        <TextInput
          id="guardian-login-given-name"
          labelText="First name"
          value={form.given_name}
          onChange={(e) => setForm((f) => ({ ...f, given_name: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, given_name: true }))}
          invalid={touched.given_name && !form.given_name.trim()}
          invalidText="Required."
        />
        <TextInput
          id="guardian-login-family-name"
          labelText="Last name"
          value={form.family_name}
          onChange={(e) => setForm((f) => ({ ...f, family_name: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, family_name: true }))}
          invalid={touched.family_name && !form.family_name.trim()}
          invalidText="Required."
        />
      </div>
      <div className="os-mt-4 os-grid os-gap-4">
        <TextInput
          id="guardian-login-username"
          labelText="Username"
          helperText="What this guardian signs in with - separate from their email."
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, username: true }))}
          invalid={touched.username && !form.username.trim()}
          invalidText="Required."
        />
      </div>
    </FormModal>
  );
}
