import { useState } from "react";
import { Button, Tag } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import DataGrid from "@/shared/ui/DataGrid";
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
      {batches && batches.length === 0 && <p className="os-text-sm os-c-tertiary os-px-6 os-py-5 os-m-0">No codes issued yet.</p>}
      {batches && batches.length > 0 && (
        <DataGrid
          rows={batches}
          getRowId={(b) => b.batch_id}
          noHover
          pagination={false}
          columns={[
            { key: "issued", header: "Issued", render: (b) => <span className="os-nowrap">{formatDate(b.created_at)}</span> },
            { key: "type", header: "Type", render: (b) => <Tag color={b.role === "student" ? "blue" : "purple"} variant="filled">{ROLE_LABELS[b.role].many}</Tag> },
            { key: "used", header: "Activated", render: (b) => <span><strong className="os-fw-500">{b.used}</strong> <span className="os-table__muted">of {b.total}</span></span> },
            { key: "live", header: "Still valid", render: (b) => live(b) },
            { key: "gone", header: "Cancelled / expired", render: (b) => <span className="os-table__muted">{b.revoked} / {b.expired}</span> },
            { key: "expires", header: "Expires", render: (b) => <span className="os-nowrap os-table__muted">{formatDate(b.expires_at)}</span> },
            {
              key: "actions",
              header: "",
              align: "end",
              render: (b) =>
                live(b) > 0 && (
                  <div className="os-grid__actions os-nowrap-flex">
                    {/* Batches issued before reprinting was set up have no stored codes to show. */}
                    {b.reprintable > 0 && <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(b)}>View codes</Button>}
                    <Button type="text" danger size="small" onClick={() => setToRevoke(b)}>Cancel unused</Button>
                  </div>
                ),
            },
          ]}
        />
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
