import { useEffect } from "react";
import { ComposedModal, InlineNotification, ModalBody, ModalHeader } from "@carbon/react";
import { useBatchCodes } from "@/features/activation/queries/useActivation";
import type { ActivationBatch } from "@/features/activation/api/activation";
import IssuedBatchPanel from "@/features/activation/components/IssuedBatchPanel";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { formatDate } from "@/shared/lib/date";

// Reopens a batch's unused codes so class sheets and the CSV can be printed again.
export default function BatchCodesModal({ batch, onClose }: { batch: ActivationBatch; onClose: () => void }) {
  const codes = useBatchCodes();
  const { mutate } = codes;

  useEffect(() => {
    mutate(batch.batch_id);
  }, [batch.batch_id, mutate]);

  return (
    <ComposedModal open size="lg" onClose={onClose} aria-label="Activation codes">
      <ModalHeader title={`${batch.role === "student" ? "Student" : "Parent"} codes issued ${formatDate(batch.created_at)}`} />
      <ModalBody>
        {codes.isPending && <LoadingSpinner />}
        <MutationErrorNotification isError={codes.isError} error={codes.error} title="Could not open these codes" />
        {codes.data && codes.data.codes.length === 0 && (
          <InlineNotification kind="info" lowContrast hideCloseButton title="No unused codes" subtitle="Every code in this batch was used, cancelled or has expired." className="os-max-w-full" />
        )}
        {codes.data && codes.data.codes.length > 0 && <IssuedBatchPanel batch={codes.data} onDone={onClose} reopened />}
      </ModalBody>
    </ComposedModal>
  );
}
