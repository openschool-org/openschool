import { Link } from "react-router";
import { CheckmarkFilled } from "@carbon/icons-react";
import type { MyClass } from "@/features/teachers/queries/useTeachers";
import type { DailySession } from "@/features/attendance/api/attendance";

export default function MyClassesPanel({
  myClasses,
  studentCountByClass,
  todaySessionByClass,
}: {
  myClasses: MyClass[];
  studentCountByClass: Map<string, number>;
  todaySessionByClass: Map<string, DailySession>;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">My classes</h2>
        <Link to="/t/classes" className="os-text-xs os-c-accent os-no-underline">View →</Link>
      </div>
      <div>
        {myClasses.length === 0 ? (
          <p className="os-p-6 os-c-tertiary os-text-sm">No classes assigned yet.</p>
        ) : (
          myClasses.map((cls) => {
            const session = todaySessionByClass.get(cls.class_id);
            const isMarked = !!session && session.marked_count > 0;
            return (
              <div key={cls.class_id} className="os-list-row os-list-row--compact os-py-3 os-px-6">
                <div className="os-flex-1">
                  <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-sm os-c-primary">{cls.grade_name} - {cls.class_name}</p>
                  <p className="os-m-0 os-text-xs os-c-secondary">{cls.subjects.join(", ")} · {studentCountByClass.get(cls.class_id) ?? 0} students</p>
                </div>
                <Link to="/t/classes" className="os-text-xs os-c-accent os-no-underline">
                  <CheckmarkFilled size={14} className={isMarked ? "os-fill-success" : "os-fill-border-subtle"} />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
