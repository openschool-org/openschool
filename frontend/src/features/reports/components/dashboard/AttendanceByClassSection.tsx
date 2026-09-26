import { Link } from "react-router";
import { WarningFilled, CheckmarkFilled, EventSchedule } from "@carbon/icons-react";
import { SkeletonText } from "@carbon/react";
import type { ClassWithDetails } from "@/features/academics/api/class";
import type { DailySession } from "@/features/attendance/api/attendance";
import type { StaffAttendanceRow } from "@/features/attendance/api/staffAttendance";
import EmptyState from "@/shared/ui/EmptyState";
import ProgressBar from "@/shared/ui/ProgressBar";
import SectionHeader from "@/shared/ui/SectionHeader";
import { STATUS_COLORS } from "@/features/reports/components/chartColors";

function ClassAttendanceBox({ cls, session }: { cls: ClassWithDetails; session: DailySession | undefined }) {
  const hasSession = !!session;
  const isMarked = !!session && session.marked_count > 0;

  return (
    <Link
      to={`/classes/${cls.id}`}
      state={{ tab: "attendance" }} className="os-block os-no-underline os-bg-layer os-border os-transition" style={{ borderTopColor: hasSession ? (isMarked ? "var(--os-success)" : "var(--os-warning)") : "var(--os-text-disabled)" }}
    >
      <div className="os-flex os-items-start os-justify-between os-mb-3">
        <div className="os-min-w-0">
          <p className="os-mt-0 os-mx-0 os-mb-h os-text-md os-fw-600 os-c-primary">{cls.name}</p>
          <p className="os-m-0 os-text-xs os-c-tertiary">{cls.grade_name}</p>
        </div>
        {hasSession ? (
          isMarked ? (
            <CheckmarkFilled size={18} className="os-fill-success os-shrink-0" aria-hidden="true" />
          ) : (
            <WarningFilled size={18} className="os-fill-warning os-shrink-0" aria-hidden="true" />
          )
        ) : (
          <EventSchedule size={18} className="os-fill-disabled os-shrink-0" />
        )}
      </div>

      {hasSession ? (
        <>
          <div className="os-flex os-justify-between os-text-xs os-mb-1h">
            <span className="os-c-secondary">{isMarked ? "Marked today" : "Pending today"}</span>
            <span className="os-fw-600 os-c-primary">
              {session.marked_count} / {session.enrolled_count}
            </span>
          </div>
          <ProgressBar size="sm" value={session.marked_count} max={session.enrolled_count} tone={isMarked ? "success" : "warning"} label={`${cls.name} students marked`} />
        </>
      ) : (
        <p className="os-m-0 os-text-xs os-c-tertiary">No session today</p>
      )}
    </Link>
  );
}

function TeacherAttendanceSummary({ teachers }: { teachers: StaffAttendanceRow[] }) {
  const counts = { present: 0, late: 0, absent: 0, leave: 0 };
  let notMarked = 0;
  for (const t of teachers) {
    if (t.status) counts[t.status] += 1;
    else notMarked += 1;
  }
  const total = teachers.length;
  const marked = total - notMarked;

  const stats: { label: string; value: number; color: string }[] = [
    { label: "Present", value: counts.present, color: STATUS_COLORS.present },
    { label: "Late", value: counts.late, color: STATUS_COLORS.late },
    { label: "Absent", value: counts.absent, color: STATUS_COLORS.absent },
    { label: "Leave", value: counts.leave, color: STATUS_COLORS.leave },
    { label: "Not marked", value: notMarked, color: "var(--os-text-tertiary)" },
  ];

  return (
    <div className="os-py-5 os-px-6">
      <div className="os-mb-4">
        <div className="os-flex os-justify-between os-text-xs os-mb-1h">
          <span className="os-c-secondary">Marked today</span>
          <span className="os-fw-600 os-c-primary">
            {marked} / {total}
          </span>
        </div>
        <ProgressBar value={marked} max={total} label="Teachers marked today" />
      </div>
      <div className="os-grid os-grid-auto-fit-100 os-gap-3">
        {stats.map((s) => (
          <div key={s.label} className="os-text-center os-p-3 os-border">
            <p className="os-mt-0 os-mx-0 os-mb-1 os-text-xl os-fw-600" style={{ color: s.color }}>{s.value}</p>
            <p className="os-m-0 os-text-xs os-c-tertiary">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoxGridSkeleton() {
  return (
    <div className="os-grid os-grid-auto-200 os-gap-4 os-py-5 os-px-6"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="os-border" >
          <SkeletonText width="70%" />
          <SkeletonText width="40%" />
        </div>
      ))}
    </div>
  );
}

export default function AttendanceByClassSection({
  classes,
  loading,
  sessionByClassId,
  teachers,
  teachersLoading,
}: {
  classes: ClassWithDetails[] | undefined;
  loading: boolean;
  sessionByClassId: Map<string, DailySession>;
  teachers?: StaffAttendanceRow[];
  teachersLoading?: boolean;
}) {
  return (
    <div className="os-section">
      <SectionHeader
        title="Attendance by class"
        meta={
          <Link to="/attendance" className="os-text-xs os-no-underline os-c-accent">
            Manage →
          </Link>
        }
      />
      {loading ? (
        <BoxGridSkeleton />
      ) : !classes || classes.length === 0 ? (
        <EmptyState
          title="No classes yet"
          description="Add a class to start taking attendance."
          action={
            <Link to="/classes/new" className="os-text-sm os-fw-500 os-c-accent">
              Add a class →
            </Link>
          }
        />
      ) : (
        <div className="os-grid os-grid-auto-200 os-gap-4 os-py-5 os-px-6"
        >
          {classes.map((c) => (
            <ClassAttendanceBox key={c.id} cls={c} session={sessionByClassId.get(c.id)} />
          ))}
        </div>
      )}

      {(teachersLoading || (teachers && teachers.length > 0)) && (
        <>
          <SectionHeader
            title="Teachers" className="os-border-t"
            meta={
              <Link to="/staff-attendance" className="os-text-xs os-no-underline os-c-accent">
                Manage →
              </Link>
            }
          />
          {teachersLoading ? (
            <BoxGridSkeleton />
          ) : (
            <TeacherAttendanceSummary teachers={teachers!} />
          )}
        </>
      )}
    </div>
  );
}
