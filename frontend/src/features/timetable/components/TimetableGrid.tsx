import type { TimetableEntry } from "@/features/timetable/api/timetable";
import type { TimetablePeriod } from "@/features/timetable/api/gradeSection";
import { WEEKDAYS } from "@/shared/lib/timetable";

interface Props {
  periods: TimetablePeriod[];
  entryAt: (day: number, period: number) => TimetableEntry | undefined;
  editable: boolean;
  onOpenCell: (day: number, period: number) => void;
}

// Period-by-day grid; each teaching cell opens the editor while the timetable is a draft.
export default function TimetableGrid({ periods, entryAt, editable, onOpenCell }: Props) {
  return (
    <table className="os-table os-min-w-50">
      <thead>
        <tr>
          <th className="os-w-8">Time</th>
          {WEEKDAYS.map((d) => <th key={d.value}>{d.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {periods.map((p) =>
          p.slot_type === "interval" ? (
            <tr key={p.id}>
              <td colSpan={WEEKDAYS.length + 1} className="os-bg-status-late os-text-center os-fw-600">
                Interval {p.start_time}–{p.end_time}
              </td>
            </tr>
          ) : (
            <tr key={p.id}>
              <td>
                <div className="os-fw-600">P{p.period_number}</div>
                <div className="os-text-xs os-c-tertiary">{p.start_time}–{p.end_time}</div>
              </td>
              {WEEKDAYS.map((d) => {
                const e = entryAt(d.value, p.period_number!);
                return (
                  <td key={d.value} onClick={() => editable && onOpenCell(d.value, p.period_number!)} className={`${editable ? "os-pointer" : "os-cursor-default"} os-min-w-8 os-align-top`}>
                    {e?.option_block_name ? (
                      <div>
                        <div className="os-fw-500">{e.option_block_name}</div>
                        <div className="os-text-xs os-c-secondary">Option block</div>
                      </div>
                    ) : e?.subject_name ? (
                      <div>
                        <div className="os-fw-500">{e.subject_name}</div>
                        <div className="os-text-xs os-c-secondary">{e.teacher_name}</div>
                        {e.classroom_name && <div className="os-text-xs os-c-tertiary">{e.classroom_name}</div>}
                      </div>
                    ) : (
                      <span className="os-text-xs os-c-disabled">{editable ? "+ Add" : ""}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
