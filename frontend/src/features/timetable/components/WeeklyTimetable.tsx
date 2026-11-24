import type { ReactNode } from "react";
import type { TimetablePeriod } from "@/features/timetable/api/gradeSection";
import { formatTimeRange, WEEKDAYS } from "@/shared/lib/timetable";
import { useT } from "@/shared/i18n/useT";
import type { MessageKey } from "@/shared/i18n/messages/en";

interface Entry {
  day_of_week: number;
  period_number: number;
  subject_name?: string | null;
  option_block_name?: string | null;
  classroom_name?: string | null;
  classroom_type?: string | null;
}

interface Props<T extends Entry> {
  entries: T[];
  // Bell schedule; without it the rows are numbered periods with no times.
  periods?: TimetablePeriod[];
  // Second line inside a block, such as the teacher or the class.
  detail?: (e: T) => ReactNode;
  // Editor mode (admin): every period cell is clickable, and empty ones offer "+ Add".
  onCellClick?: (day: number, period: number) => void;
  // Hides the today highlight, which means nothing while a timetable is being drafted.
  showToday?: boolean;
}

// Matches the 15 --os-subject-* colours; a timetable has at most 15 subjects, so none share a colour.
const PALETTE_SIZE = 15;

// Weekly grid: periods down the side, Monday to Friday across, one coloured block per subject.
export default function WeeklyTimetable<T extends Entry>({ entries, periods, detail, onCellClick, showToday = true }: Props<T>) {
  const { t } = useT();
  // A subject in a lab is its practical; a period with only a room, such as the library, takes the room's name.
  const name = (e: T) =>
    e.subject_name && e.classroom_type === "lab"
      ? t("timetable.practical", { subject: e.subject_name })
      : (e.subject_name ?? e.option_block_name ?? e.classroom_name ?? "-");
  // An option block splits the class by subject, so it names itself as one.
  const blockNote = (e: T) => (e.option_block_name && !e.subject_name ? t("timetable.optionBlock") : null);
  // Special rooms are named in the block; the class's own room is not.
  const room = (e: T) => (e.classroom_type && e.classroom_type !== "regular" && e.subject_name ? e.classroom_name : null);
  // Each subject gets its own colour by its place in the sorted subject list, so two subjects never match.
  const subjects = [...new Set(entries.map(name))].sort();
  const colour = (e: T) => `is-c${subjects.indexOf(name(e)) % PALETTE_SIZE}`;
  const at = (day: number, period: number) => entries.filter((e) => e.day_of_week === day && e.period_number === period);
  const today = showToday ? new Date().getDay() : -1;

  const maxPeriod = Math.max(0, ...entries.map((e) => e.period_number));
  const rows: TimetablePeriod[] = periods?.length
    ? [...periods].sort((a, b) => a.sort_order - b.sort_order)
    : Array.from({ length: maxPeriod }, (_, i) => ({ id: `p${i + 1}`, sort_order: i, period_number: i + 1, start_time: "", end_time: "", slot_type: "period" as const }));

  return (
    <div className="os-tt-scroll">
      <table className="os-tt">
        <thead>
          <tr>
            <th scope="col" className="os-tt__time">{t("table.period")}</th>
            {WEEKDAYS.map((d) => (
              <th key={d.value} scope="col" className={d.value === today ? "is-today" : undefined}>
                {t(`weekday.${d.value}` as MessageKey)}
                {d.value === today && <span className="os-tt__today">{t("timetable.today")}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.slot_type === "interval" || row.period_number === null ? (
              <tr key={row.id} className="os-tt__interval">
                <th scope="row" className="os-tt__time"><span className="os-tt__clock">{formatTimeRange(row.start_time, row.end_time)}</span></th>
                <td colSpan={WEEKDAYS.length}>{t("timetable.interval")}</td>
              </tr>
            ) : (
              <tr key={row.id}>
                <th scope="row" className="os-tt__time">
                  <span className="os-tt__period">{t("table.periodShort", { n: row.period_number })}</span>
                  {row.start_time && <span className="os-tt__clock">{formatTimeRange(row.start_time, row.end_time)}</span>}
                </th>
                {WEEKDAYS.map((d) => {
                  const cell = at(d.value, row.period_number!);
                  return (
                    <td
                      key={d.value}
                      className={[d.value === today ? "is-today" : "", onCellClick ? "is-editable" : ""].join(" ").trim() || undefined}
                      onClick={onCellClick ? () => onCellClick(d.value, row.period_number!) : undefined}
                    >
                      {onCellClick && cell.length === 0 && (
                        <button type="button" className="os-tt__add">{t("timetable.add")}</button>
                      )}
                      {cell.map((e, i) => (
                        <div key={i} className={`os-tt__block ${colour(e)}`}>
                          <span className="os-tt__subject">{name(e)}</span>
                          {detail && <span className="os-tt__detail">{detail(e)}</span>}
                          {room(e) && <span className="os-tt__detail">{room(e)}</span>}
                          {blockNote(e) && <span className="os-tt__detail">{blockNote(e)}</span>}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
