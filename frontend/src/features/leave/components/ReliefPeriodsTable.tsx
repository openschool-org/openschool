import { InlineNotification, Select, SelectItem, SkeletonText } from "@carbon/react";
import type { AffectedPeriod } from "@/features/leave/api/leave";
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

// The relief section of the leave form: who takes each class the teacher will miss.
export default function ReliefPeriodsTable({ periods, truncated, isLoading, relief, onPick }: Props) {
  if (isLoading) return <SkeletonText paragraph lineCount={3} />;
  if (periods.length === 0) {
    return <p className="os-text-sm os-c-secondary">You have no timetabled periods in this time, so no relief is needed.</p>;
  }
  return (
    <>
      {truncated && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          className="os-mb-4 os-max-w-full"
          title="Long leave"
          subtitle="Only the first two weeks of periods are listed. Name an acting teacher above; the Principal arranges relief after that."
        />
      )}
      <div className="os-table-scroll">
        <table className="os-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Period</th>
              <th>Class</th>
              <th>Subject</th>
              <th>Relief teacher</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <ReliefRow key={periodKey(p)} period={p} value={relief[periodKey(p)] ?? ""} onPick={(id) => onPick(periodKey(p), id)} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReliefRow({ period, value, onPick }: { period: AffectedPeriod; value: string; onPick: (id: string) => void }) {
  const { data: candidates, isLoading } = useReliefCandidates(period.date, period.period_number);
  const time = period.start_time ? ` (${period.start_time}-${period.end_time})` : "";
  return (
    <tr>
      <td className="os-table__mono">{formatDate(period.date)}</td>
      <td>{period.period_number}{time}</td>
      <td>{period.class_name}</td>
      <td className="os-table__muted">{period.subject_name || "-"}</td>
      <td>
        <Select
          id={`relief-${period.date}-${period.period_number}-${period.class_id}`}
          labelText="Relief teacher"
          hideLabel
          size="sm"
          value={value}
          disabled={isLoading}
          onChange={(e) => onPick(e.target.value)}
        >
          <SelectItem value="" text={isLoading ? "Loading…" : "Leave for the Principal to arrange"} />
          {(candidates ?? []).map((c) => (
            <SelectItem key={c.id} value={c.id} text={c.relief_periods > 0 ? `${c.full_name} (${c.relief_periods} relief today)` : c.full_name} />
          ))}
        </Select>
      </td>
    </tr>
  );
}
