import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader, SkeletonText } from "@carbon/react";
import { CheckmarkFilled, ChevronRight, EventSchedule, WarningFilled } from "@carbon/icons-react";
import type { ClassWithDetails } from "@/features/academics/api/class";
import type { DailySession } from "@/features/attendance/api/attendance";
import EmptyState from "@/shared/ui/EmptyState";
import ProgressBar from "@/shared/ui/ProgressBar";
import SectionHeader from "@/shared/ui/SectionHeader";
import MediumTag from "@/shared/ui/MediumTag";

function ClassAttendanceBox({ cls, session }: { cls: ClassWithDetails; session: DailySession | undefined }) {
  const hasSession = !!session;
  const isMarked = !!session && session.marked_count > 0;

  return (
    <Link
      to={`/classes/${cls.id}`}
      state={{ tab: "attendance" }}
      className="os-attendance-class-card os-block os-no-underline os-bg-layer os-border os-transition"
      style={{ borderTopColor: hasSession ? (isMarked ? "var(--os-success)" : "var(--os-warning)") : "var(--os-text-disabled)" }}
    >
      <div className="os-flex os-items-start os-justify-between os-mb-3">
        <div className="os-min-w-0">
          <p className="os-mt-0 os-mx-0 os-mb-h os-text-md os-fw-600 os-c-primary">{cls.name}</p>
          {cls.medium_name && <MediumTag name={cls.medium_name} />}
        </div>
        {hasSession ? (
          isMarked ? <CheckmarkFilled size={18} className="os-fill-success os-shrink-0" aria-label="Attendance marked" /> : <WarningFilled size={18} className="os-fill-warning os-shrink-0" aria-label="Attendance pending" />
        ) : <EventSchedule size={18} className="os-fill-disabled os-shrink-0" aria-label="No session" />}
      </div>

      {hasSession ? (
        <>
          <div className="os-flex os-justify-between os-text-xs os-mb-1h">
            <span className="os-c-secondary">{isMarked ? "Marked today" : "Pending today"}</span>
            <span className="os-fw-600 os-c-primary">{session.marked_count} / {session.enrolled_count}</span>
          </div>
          <ProgressBar size="sm" value={session.marked_count} max={session.enrolled_count} tone={isMarked ? "success" : "warning"} label={`${cls.name} students marked`} />
        </>
      ) : <p className="os-m-0 os-text-xs os-c-tertiary">No session today</p>}
    </Link>
  );
}

function GradeGridSkeleton() {
  return (
    <div className="os-attendance-grade-grid os-py-5 os-px-6">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="os-attendance-grade-card"><SkeletonText width="55%" /><SkeletonText width="35%" /></div>)}
    </div>
  );
}

export default function AttendanceByClassSection({
  classes,
  loading,
  sessionByClassId,
}: {
  classes: ClassWithDetails[] | undefined;
  loading: boolean;
  sessionByClassId: Map<string, DailySession>;
}) {
  const [selectedGradeName, setSelectedGradeName] = useState<string | null>(null);
  const grades = useMemo(() => {
    const grouped = new Map<string, ClassWithDetails[]>();
    for (const cls of classes ?? []) grouped.set(cls.grade_name, [...(grouped.get(cls.grade_name) ?? []), cls]);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([name, gradeClasses]) => ({ name, classes: gradeClasses }));
  }, [classes]);
  const selectedGrade = grades.find((grade) => grade.name === selectedGradeName) ?? null;

  return (
    <div className="os-section">
      <SectionHeader
        title="Attendance by grade"
        meta={<Link to="/attendance" className="os-text-xs os-no-underline os-c-accent">Manage →</Link>}
      />
      {loading ? <GradeGridSkeleton /> : !classes || classes.length === 0 ? (
        <EmptyState title="No classes yet" description="Add a class to start taking attendance." action={<Link to="/classes/new" className="os-text-sm os-fw-500 os-c-accent">Add a class →</Link>} />
      ) : (
        <div className="os-attendance-grade-grid os-py-5 os-px-6">
          {grades.map((grade) => {
            const marked = grade.classes.filter((cls) => sessionByClassId.get(cls.id)?.marked_count).length;
            const pending = grade.classes.filter((cls) => {
              const session = sessionByClassId.get(cls.id);
              return !!session && session.marked_count === 0;
            }).length;
            return (
              <button key={grade.name} type="button" className="os-attendance-grade-card" onClick={() => setSelectedGradeName(grade.name)} aria-label={`View attendance for ${grade.name}`}>
                <div className="os-flex os-items-start os-justify-between os-gap-3">
                  <div>
                    <p className="os-attendance-grade-card__eyebrow">Grade</p>
                    <h3>{grade.name.replace(/^Grade\s*/i, "")}</h3>
                  </div>
                  <ChevronRight size={20} className="os-fill-accent os-shrink-0" />
                </div>
                <p className="os-attendance-grade-card__classes">{grade.classes.length} class{grade.classes.length === 1 ? "" : "es"}</p>
                <div className="os-attendance-grade-card__summary">
                  <span><strong>{marked}</strong> marked</span>
                  <span><strong>{pending}</strong> pending</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ComposedModal open={!!selectedGrade} size="lg" onClose={() => setSelectedGradeName(null)} aria-label={selectedGrade ? `${selectedGrade.name} attendance` : "Grade attendance"}>
        <ModalHeader title={selectedGrade ? `${selectedGrade.name} attendance` : "Grade attendance"} />
        <ModalBody>
          <p className="os-mt-0 os-mb-4 os-text-sm os-c-secondary">Today’s attendance by class. Select a class to view or manage its attendance.</p>
          {selectedGrade && <div className="os-attendance-class-grid">{selectedGrade.classes.map((cls) => <ClassAttendanceBox key={cls.id} cls={cls} session={sessionByClassId.get(cls.id)} />)}</div>}
        </ModalBody>
        <ModalFooter><Button kind="secondary" onClick={() => setSelectedGradeName(null)}>Close</Button></ModalFooter>
      </ComposedModal>
    </div>
  );
}
