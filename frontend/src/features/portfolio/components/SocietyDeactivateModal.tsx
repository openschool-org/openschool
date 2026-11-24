import { useState } from "react";
import FormModal from "@/shared/ui/FormModal";
import TextAreaField from "@/shared/ui/TextAreaField";
import { useDeactivateSocietyMember } from "@/features/portfolio/queries/useSocieties";
import type { SocietyMember } from "@/features/portfolio/api/society";

interface Props {
  societyId: string;
  member: SocietyMember | null;
  onClose: () => void;
}

// Marks a member as left with an optional reason; the membership stays as history.
export default function SocietyDeactivateModal({ societyId, member, onClose }: Props) {
  const [reason, setReason] = useState("");
  const deactivate = useDeactivateSocietyMember(societyId);

  const close = () => {
    deactivate.reset();
    setReason("");
    onClose();
  };

  return (
    <FormModal
      open={!!member}
      title="Deactivate member"
      onClose={close}
      onSubmit={() => member && deactivate.mutate({ memberId: member.id, studentId: member.student_id, reason }, { onSuccess: close })}
      isPending={deactivate.isPending}
      submitLabel="Deactivate"
      isError={deactivate.isError}
      error={deactivate.error}
      errorTitle="Could not deactivate member"
      errorFallback="Please try again."
    >
      <div className="os-stack os-gap-4">
        <p className="os-m-0">
          <strong>{member?.student_name}</strong> will move to former members. The membership stays on their portfolio, and they stop receiving society notices.
        </p>
        <TextAreaField id="society-left-reason" label="Reason (optional)" placeholder="e.g. Left the school, joined another society…" rows={3} maxLength={500} value={reason} onChange={setReason} />
      </div>
    </FormModal>
  );
}
