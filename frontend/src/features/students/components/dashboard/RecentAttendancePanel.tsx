import { Link } from "react-router";
import type { ChildAttendanceRecord } from "@/features/parent/api/parent";
import AttendanceStatusBadge from "@/features/attendance/components/AttendanceStatusBadge";
import SectionCard from "@/shared/ui/SectionCard";
import EmptyState from "@/shared/ui/EmptyState";
import { formatLongDate } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";

// The last few school days, newest first.
export default function RecentAttendancePanel({ records }: { records: ChildAttendanceRecord[] }) {
  const { t } = useT();
  const recent = [...records].sort((a, b) => b.session_date.localeCompare(a.session_date)).slice(0, 5);
  return (
    <SectionCard title={t("student.recentAttendance")} meta={<Link to="/s/attendance">{t("student.viewAll")}</Link>} flush>
      {recent.length === 0 ? (
        <EmptyState title={t("attendance.emptyTitle")} description={t("attendance.emptyDesc")} />
      ) : (
        <ul className="os-dash-list">
          {recent.map((r) => (
            <li key={r.id} className="os-dash-list__row">
              <div className="os-dash-list__main">
                <p className="os-dash-list__title">{formatLongDate(r.session_date)}</p>
                {r.note && <p className="os-dash-list__sub">{r.note}</p>}
              </div>
              <AttendanceStatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
