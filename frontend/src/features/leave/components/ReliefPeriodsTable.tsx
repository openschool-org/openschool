import { useMemo } from "react";
import { Alert, Select, Skeleton } from "antd";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import type { AffectedPeriod, ReliefCandidate } from "@/features/leave/api/leave";
import { periodKey } from "@/features/leave/hooks/useLeaveForm";
import { useReliefCandidates } from "@/features/leave/queries/useLeave";
import { formatDate } from "@/shared/lib/date";

interface Props {
  periods: AffectedPeriod[];
  truncated: boolean;
  isLoading: boolean;
  relief: Record<string, string>;
  onPick: (key: string, teacherId: string) => void;
}

const slotKey = (p: Pick<AffectedPeriod, "date" | "period_number">) => `${p.date}:${p.period_number}`;

// The relief section of the leave form: who takes each class the teacher will miss.
export default function ReliefPeriodsTable({ periods, truncated, isLoading, relief, onPick }: Props) {
  const slots = useMemo(() => [...new Set(periods.map(slotKey))], [periods]);
  const candidates = useReliefCandidates(slots);
  const bySlot = useMemo(() => new Map((candidates.data ?? []).map((s) => [slotKey(s), s.candidates])), [candidates.data]);
  if (isLoading) return <Skeleton active title={false} paragraph={{ rows: 3 }} />;
  if (periods.length === 0) {
    return <p className="os-text-sm os-c-secondary">You have no timetabled periods in this time, so no relief is needed.</p>;
  }
  // A teacher can't take two classes in the same period, so each picker hides teachers already chosen for that slot.
  const candidatesFor = (p: AffectedPeriod) =>
    (bySlot.get(slotKey(p)) ?? []).filter((candidate) =>
      candidate.id === relief[periodKey(p)] || !periods.some((other) => slotKey(other) === slotKey(p) && periodKey(other) !== periodKey(p) && relief[periodKey(other)] === candidate.id),
    );

  const columns: GridColumn<AffectedPeriod>[] = [
    { key: "date", header: "Date", render: (p) => <span className="os-table__mono">{formatDate(p.date)}</span> },
    { key: "period", header: "Period", render: (p) => <>{p.period_number}{p.start_time ? ` (${p.start_time}-${p.end_time})` : ""}</> },
    { key: "class", header: "Class", render: (p) => p.class_name },
    { key: "subject", header: "Subject", render: (p) => <span className="os-table__muted">{p.subject_name || "-"}</span> },
    {
      key: "relief",
      header: "Relief teacher",
      render: (p) => <ReliefPicker period={p} candidates={candidatesFor(p)} isLoading={candidates.isLoading} value={relief[periodKey(p)] ?? ""} onPick={(id) => onPick(periodKey(p), id)} />,
    },
  ];

  return (
    <>
      {truncated && (
        <Alert
          type="info"
          showIcon
          className="os-mb-4"
          title="Long leave"
          description="Only the first two weeks of periods are listed. Name an acting teacher above; the Principal arranges relief after that."
        />
      )}
      <DataGrid rows={periods} columns={columns} getRowId={periodKey} pagination={false} noHover />
    </>
  );
}

interface PickerProps {
  period: AffectedPeriod;
  candidates: ReliefCandidate[];
  isLoading: boolean;
  value: string;
  onPick: (id: string) => void;
}

function ReliefPicker({ period, candidates, isLoading, value, onPick }: PickerProps) {
  return (
    <Select
      id={`relief-${period.date}-${period.period_number}-${period.class_id}`}
      aria-label={`Relief teacher for period ${period.period_number}, ${period.class_name}`}
      size="small"
      className="os-min-w-16"
      value={value}
      disabled={isLoading}
      onChange={(v: string) => onPick(v)}
      options={[
        { value: "", label: isLoading ? "Loading…" : "Leave for the Principal to arrange" },
        ...candidates.map((c) => ({ value: c.id, label: c.relief_periods > 0 ? `${c.full_name} (${c.relief_periods} relief today)` : c.full_name })),
      ]}
    />
  );
}
