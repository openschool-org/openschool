import { useEffect } from "react";
import { Alert, Modal } from "antd";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
import { useBatchCodes } from "@/features/activation/queries/useActivation";
import type { ActivationBatch } from "@/features/activation/api/activation";
import IssuedBatchPanel from "@/features/activation/components/IssuedBatchPanel";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { formatDate } from "@/shared/lib/date";
import { ROLE_LABELS } from "@/features/activation/lib/roles";

// Reopens a batch's unused codes so class sheets and the CSV can be printed again.
export default function BatchCodesModal({ batch, onClose }: { batch: ActivationBatch; onClose: () => void }) {
  const codes = useBatchCodes();
  const { mutate } = codes;

  useEffect(() => {
    mutate(batch.batch_id);
  }, [batch.batch_id, mutate]);

  return (
    <Modal open width={MODAL_WIDTH.lg} onCancel={onClose} footer={null} title={`${ROLE_LABELS[batch.role].one} codes issued ${formatDate(batch.created_at)}`}>
        {codes.isPending && <LoadingSpinner />}
        <MutationErrorNotification isError={codes.isError} error={codes.error} title="Could not open these codes" />
        {codes.data && codes.data.codes.length === 0 && (
          <Alert type="info" showIcon title="No unused codes" description="Every code in this batch was used, cancelled or has expired." />
        )}
        {codes.data && codes.data.codes.length > 0 && <IssuedBatchPanel batch={codes.data} onDone={onClose} reopened />}
    </Modal>
  );
}
