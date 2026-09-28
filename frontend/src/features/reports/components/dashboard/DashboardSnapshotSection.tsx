import { Link } from "react-router";
import { Education } from "@carbon/icons-react";
import { SkeletonText } from "@carbon/react";
import type { StaffAttendanceRow } from "@/features/attendance/api/staffAttendance";
import ProgressBar from "@/shared/ui/ProgressBar";
import SectionHeader from "@/shared/ui/SectionHeader";

type Props = {
  teachers?: StaffAttendanceRow[];
  teachersLoading: boolean;
};

export default function DashboardSnapshotSection({ teachers, teachersLoading }: Props) {
  const totalTeachers = teachers?.length ?? 0;
  const markedTeachers = teachers?.filter((teacher) => teacher.status).length ?? 0;

  return (
    <div className="os-section os-dashboard-snapshot">
      <SectionHeader
        title="Today at a glance"
        meta={<Link to="/staff-attendance" className="os-text-xs os-no-underline os-c-accent">Manage →</Link>}
      />
      <div className="os-snapshot-block">
        <div className="os-snapshot-heading">
          <div className="os-snapshot-icon"><Education size={18} /></div>
          <div><strong>Teachers</strong><span>Attendance marked today</span></div>
        </div>
        {teachersLoading ? <SkeletonText width="70%" /> : (
          <>
            <div className="os-flex os-justify-between os-text-xs os-mb-1h">
              <span className="os-c-secondary">Marked today</span>
              <strong>{markedTeachers} / {totalTeachers}</strong>
            </div>
            <ProgressBar value={markedTeachers} max={totalTeachers} label="Teachers marked today" />
          </>
        )}
      </div>
    </div>
  );
}
