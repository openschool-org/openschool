import { useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button, Select, SelectItem } from "@carbon/react";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import SectionCard from "@/shared/ui/SectionCard";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import type { LeaveRequest } from "@/features/leave/api/leave";
import { LEAVE_TYPE_LABELS } from "@/features/leave/constants";
import { useCancelLeave, useMyLeave, useMyLeaveBalance } from "@/features/leave/queries/useLeave";
import ApplyLeaveModal from "@/features/leave/components/ApplyLeaveModal";
import LeaveBalanceCards from "@/features/leave/components/LeaveBalanceCards";
import LeaveStatusTag from "@/features/leave/components/LeaveStatusTag";
import MyReliefDuties from "@/features/leave/components/MyReliefDuties";
import { leaveDates, leaveDays } from "@/features/leave/components/leaveText";

// A teacher's leave: balance, applications and the relief periods they cover.
export default function MyLeave() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [applying, setApplying] = useState(false);
  const [toCancel, setToCancel] = useState<LeaveRequest | null>(null);
  const balance = useMyLeaveBalance(year);
  const requests = useMyLeave(year);
  const cancel = useCancelLeave();

  const columns: GridColumn<LeaveRequest>[] = [
    { key: "type", header: "Leave", render: (r) => LEAVE_TYPE_LABELS[r.leave_type] },
    { key: "dates", header: "Dates", render: (r) => leaveDates(r) },
    { key: "days", header: "Days", render: (r) => leaveDays(r) },
    { key: "reason", header: "Reason", render: (r) => <span className="os-table__muted">{r.reason}</span> },
    { key: "status", header: "Status", render: (r) => <LeaveStatusTag status={r.status} /> },
    { key: "note", header: "Principal's note", render: (r) => <span className="os-table__muted">{r.decision_note || "-"}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (r) => r.status === "pending" && <Button kind="ghost" size="sm" onClick={() => setToCancel(r)}>Cancel</Button>,
    },
  ];

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My leave</h1>
          <p className="os-page__subtitle">Apply for leave, arrange relief for your periods and follow the Principal's decision</p>
        </div>
        <div className="os-flex os-gap-2 os-items-end">
          <Select id="leave-year" labelText="Year" hideLabel size="md" value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => <SelectItem key={y} value={String(y)} text={String(y)} />)}
          </Select>
          <Button renderIcon={Add} kind="primary" size="md" onClick={() => setApplying(true)}>Apply for leave</Button>
        </div>
      </div>

      <div className="os-mb-6">
        <LeaveBalanceCards balance={balance.data} isLoading={balance.isLoading} />
      </div>

      <SectionCard title="My applications" flush className="os-mb-6">
        <MutationErrorNotification
          isError={cancel.isError}
          error={cancel.error}
          title="Could not cancel the application"
          fallback="Please try again."
          onClose={() => cancel.reset()}
          className="os-section__notice"
        />
        <ListState
          isLoading={requests.isLoading}
          isError={requests.isError}
          isEmpty={(requests.data ?? []).length === 0}
          errorMessage="Failed to load your leave"
          onRetry={requests.refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No leave this year", description: "Apply for leave when you need to be away, even for part of a day." }}
        >
          <DataGrid rows={requests.data ?? []} columns={columns} getRowId={(r) => r.id} />
        </ListState>
      </SectionCard>

      <SectionCard title="My relief duties" flush>
        <MyReliefDuties />
      </SectionCard>

      <ApplyLeaveModal open={applying} onClose={() => setApplying(false)} />
      <ConfirmActionModal
        open={!!toCancel}
        title="Cancel leave application"
        description="Withdraw this application? The Principal will no longer see it."
        confirmLabel="Cancel application"
        danger
        pending={cancel.isPending}
        onClose={() => setToCancel(null)}
        onConfirm={() => toCancel && cancel.mutate(toCancel.id, { onSuccess: () => setToCancel(null) })}
      />
    </div>
  );
}
