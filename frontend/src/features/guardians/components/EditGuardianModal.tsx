import { useUpdateGuardian } from "@/features/guardians/queries/useGuardians";
import type { Guardian } from "@/features/guardians/api/guardian";
import { useGuardianForm } from "@/features/guardians/hooks/useGuardianForm";
import GuardianFields from "@/features/guardians/components/GuardianFields";
import FormModal from "@/shared/ui/FormModal";

export default function EditGuardianModal({ guardian, onClose }: { guardian: Guardian; onClose: () => void }) {
  const updateGuardian = useUpdateGuardian();
  const { form, touched, isValid, patch, touch, touchAll } = useGuardianForm({
    full_name: guardian.full_name,
    name_with_initials: guardian.name_with_initials ?? "",
    calling_name: guardian.calling_name ?? "",
    relationship: guardian.relationship,
    phone: guardian.phone,
    email: guardian.email ?? "",
    nic_number: guardian.nic_number,
  });

  const handleSave = () => {
    touchAll();
    if (!isValid) return;
    updateGuardian.mutate(
      {
        id: guardian.id,
        data: {
          full_name: form.full_name.trim(),
          name_with_initials: form.name_with_initials.trim(),
          calling_name: form.calling_name.trim(),
          relationship: form.relationship,
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          nic_number: form.nic_number.trim(),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <FormModal
      open
      title="Edit guardian"
      onClose={onClose}
      onSubmit={handleSave}
      isPending={updateGuardian.isPending}
      isError={updateGuardian.isError}
      error={updateGuardian.error}
      errorFallback="Failed to update guardian"
    >
      <GuardianFields idPrefix="edit-guardian" form={form} touched={touched} onChange={patch} onTouch={touch} />
    </FormModal>
  );
}
