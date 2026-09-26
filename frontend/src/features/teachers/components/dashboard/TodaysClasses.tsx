import { Link } from "react-router";
import { Tag } from "@carbon/react";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import type { MyClass } from "@/features/teachers/queries/useTeachers";
import type { DailySession } from "@/features/attendance/api/attendance";
import { formatLongDate } from "@/shared/lib/date";

export default function TodaysClasses({
  loading,
  myClasses,
  studentCountByClass,
  todaySessionByClass,
}: {
  loading: boolean;
  myClasses: MyClass[];
  studentCountByClass: Map<string, number>;
  todaySessionByClass: Map<string, DailySession>;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Today's classes</h2>
        <span className="os-text-xs os-c-tertiary">
          {formatLongDate(new Date())}
        </span>
      </div>
      <div>
        {loading ? (
          <LoadingSpinner />
        ) : myClasses.length === 0 ? (
          <p className="os-p-6 os-c-tertiary os-text-sm">No classes assigned yet.</p>
        ) : (
          myClasses.map((cls) => {
            const session = todaySessionByClass.get(cls.class_id);
            const isMarked = !!session && session.marked_count > 0;
            return (
              <div key={cls.class_id} className="os-list-row os-py-4 os-px-6 os-wrap">
                <div className="os-w-2q os-h-2q os-bg-accent-light os-flex os-items-center os-justify-center os-shrink-0 os-fw-700 os-text-xs os-c-accent">
                  {cls.class_name}
                </div>
                <div className="os-flex-1 os-min-w-0">
                  <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-md os-c-primary">
                    {cls.grade_name} - {cls.class_name}
                  </p>
                  <p className="os-m-0 os-text-xs os-c-secondary">
                    {cls.subjects.join(", ")} · {studentCountByClass.get(cls.class_id) ?? 0} students
                  </p>
                </div>
                <div className="os-flex os-items-center os-gap-2">
                  <Tag type={isMarked ? "blue" : "gray"} size="sm">
                    {isMarked ? "Marked" : "Pending"}
                  </Tag>
                  {session ? (
                    <Link to={`/attendance/sessions/${session.id}/mark`} className="os-text-sm os-c-tertiary os-no-underline os-nowrap">
                      View →
                    </Link>
                  ) : (
                    <Link to="/t/attendance" className="os-text-sm os-c-accent os-no-underline os-fw-500 os-nowrap">
                      Mark now →
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
