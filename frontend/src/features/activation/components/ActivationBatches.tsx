import { useState } from "react";
import { Button, Tag } from "@carbon/react";
import { View } from "@carbon/icons-react";
import { useActivationBatches, useRevokeBatch } from "@/features/activation/queries/useActivation";
import type { ActivationBatch } from "@/features/activation/api/activation";
import BatchCodesModal from "@/features/activation/components/BatchCodesModal";
import SectionCard from "@/shared/ui/SectionCard";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { formatDate } from "@/shared/lib/date";
import { ROLE_LABELS } from "@/features/activation/lib/roles";

const live = (b: ActivationBatch) => b.total - b.used - b.revoked - b.expired;

// Tracks how many codes from each run were used, reopens unused codes for printing, and cancels a run if its sheet goes missing.
export default function ActivationBatches() {
  const { data: batches, isLoading, isError, refetch } = useActivationBatches();
  const revoke = useRevokeBatch();
  const [toRevoke, setToRevoke] = useState<ActivationBatch | null>(null);
  const [viewing, setViewing] = useState<ActivationBatch | null>(null);

  return (
    <SectionCard title="Issued batches" flush>
      <MutationErrorNotification isError={revoke.isError} error={revoke.error} title="Could not cancel codes" className="os-m-4" />
      {isLoading && <TableSkeleton headers={["Issued", "Type", "Activated", "Still valid", "Cancelled / expired", "Expires"]} />}
      {isError && <ErrorMessage message="Could not load issued batches." onRetry={refetch} />}
      {batches && batches.length === 0 && <p className="os-text-sm os-c-secondary os-p-4 os-m-0">No codes issued yet.</p>}
      {batches && batches.length > 0 && (
        <table className="os-table">
          <thead>
            <tr>
              <th>Issued</th>
              <th>Type</th>
              <th>Activated</th>
              <th>Still valid</th>
              <th>Cancelled / expired</th>
              <th>Expires</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.batch_id}>
                <td>{formatDate(b.created_at)}</td>
                <td><Tag type={b.role === "student" ? "blue" : "purple"} size="sm">{ROLE_LABELS[b.role].many}</Tag></td>
                <td>{b.used} of {b.total}</td>
                <td>{live(b)}</td>
                <td>{b.revoked} / {b.expired}</td>
                <td>{formatDate(b.expires_at)}</td>
                <td>
                  {live(b) > 0 && (
                    <div className="os-flex os-gap-2 os-justify-end">
                      {/* Batches issued before reprinting was set up have no stored codes to show. */}
                      {b.reprintable > 0 && <Button kind="ghost" size="sm" renderIcon={View} onClick={() => setViewing(b)}>View codes</Button>}
                      <Button kind="danger--ghost" size="sm" onClick={() => setToRevoke(b)}>Cancel unused</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {viewing && <BatchCodesModal batch={viewing} onClose={() => setViewing(null)} />}
      <ConfirmActionModal
        open={!!toRevoke}
        title="Cancel unused codes?"
        description={`The ${toRevoke ? live(toRevoke) : 0} codes from this batch that are still valid will stop working. Accounts already activated are not affected.`}
        confirmLabel="Cancel codes"
        danger
        pending={revoke.isPending}
        onClose={() => setToRevoke(null)}
        onConfirm={() => toRevoke && revoke.mutate(toRevoke.batch_id, { onSuccess: () => setToRevoke(null) })}
      />
    </SectionCard>
  );
}
