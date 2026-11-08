import { Link } from "react-router";
import { Card, Progress, Skeleton } from "antd";
import type { StaffAttendanceRow } from "@/features/attendance/api/staffAttendance";

type Props = {
  teachers?: StaffAttendanceRow[];
  nonAcademicStaff?: StaffAttendanceRow[];
  staffLoading: boolean;
};

function StaffBlock({ label, rows, loading }: { label: string; rows?: StaffAttendanceRow[]; loading: boolean }) {
  const total = rows?.length ?? 0;
  const marked = rows?.filter((member) => !!member.status).length ?? 0;
  const percent = total > 0 ? Math.round((marked / total) * 100) : 0;

  return (
    <div className="os-dash-staff__block">
      <div className="os-dash-staff__head">
        <strong>{label}</strong>
        <span>Attendance marked today</span>
      </div>
      {loading ? <Skeleton title={false} paragraph={{ rows: 1 }} /> : (
        <>
          <div className="os-dash-staff__row"><span>Marked today</span><strong>{marked} / {total}</strong></div>
          <Progress percent={percent} showInfo={false} size={{ height: 6 }} aria-label={`${label} marked today`} />
        </>
      )}
    </div>
  );
}

export default function DashboardSnapshotSection({ teachers, nonAcademicStaff, staffLoading }: Props) {
  return (
    <Card className="os-dash-card is-flush" title="Staff attendance" extra={<Link to="/staff-attendance">Manage</Link>}>
      <div className="os-dash-staff">
        <StaffBlock label="Teachers" rows={teachers} loading={staffLoading} />
        <StaffBlock label="Non-academic staff" rows={nonAcademicStaff} loading={staffLoading} />
      </div>
    </Card>
  );
}
