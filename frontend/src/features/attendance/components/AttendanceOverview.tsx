import { useMemo, useState } from "react";
import { Select } from "antd";
import type { ChildAttendanceRecord } from "@/features/parent/api/parent";
import AttendanceMonthCards from "@/features/attendance/components/AttendanceMonthCards";
import AttendanceHistoryTable from "@/features/attendance/components/AttendanceHistoryTable";
import { summariseByMonth } from "@/features/attendance/lib/monthlySummary";
import FilterBar from "@/shared/ui/FilterBar";
import SectionCard from "@/shared/ui/SectionCard";
import EmptyState from "@/shared/ui/EmptyState";
import { formatLongDate, formatMonthLong } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";
import { translateValue } from "@/shared/i18n/translateValue";

const STATUSES = ["present", "late", "absent", "excused"] as const;

// Monthly summary first, then the day-by-day history with search; used by the student and parent portals.
export default function AttendanceOverview({ records }: { records: ChildAttendanceRecord[] }) {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const months = useMemo(() => summariseByMonth(records), [records]);

  const filtered = useMemo(() => {
    const words = search.trim().toLowerCase();
    return records.filter((r) => {
      if (status && r.status !== status) return false;
      if (!words) return true;
      // Matches 2026-11-04, "Wednesday", "4 November", "November 2026", a status or a note.
      const text = [r.session_date, formatLongDate(r.session_date), formatMonthLong(r.session_date), translateValue(t, "status", r.status), r.note ?? ""]
        .join(" ")
        .toLowerCase();
      return words.split(/\s+/).every((w) => text.includes(w));
    });
  }, [records, search, status, t]);

  if (records.length === 0) {
    return <EmptyState title={t("attendance.emptyTitle")} description={t("attendance.emptyDesc")} />;
  }

  return (
    <div className="os-grid os-gap-6">
      <section className="os-grid os-gap-3" aria-label={t("attendance.byMonth")}>
        <h2 className="os-m-0 os-text-md os-fw-600">{t("attendance.byMonth")}</h2>
        <AttendanceMonthCards months={months} />
      </section>
      <SectionCard title={t("attendance.history")} flush>
        <div className="os-section__body">
          <FilterBar
            search={{ value: search, onChange: setSearch, placeholder: t("attendance.searchPlaceholder") }}
            controls={[
              {
                label: t("attendance.statusFilter"),
                node: (
                  <Select
                    className="os-min-w-12"
                    value={status}
                    onChange={setStatus}
                    options={[{ value: "", label: t("attendance.allStatuses") }, ...STATUSES.map((s) => ({ value: s, label: translateValue(t, "status", s) }))]}
                  />
                ),
              },
            ]}
          />
        </div>
        {filtered.length ? (
          <AttendanceHistoryTable rows={filtered} />
        ) : (
          <EmptyState title={t("attendance.noMatchTitle")} description={t("attendance.noMatchDesc")} />
        )}
      </SectionCard>
    </div>
  );
}
