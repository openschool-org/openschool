import { SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useMyTeacherSchedule } from "../../queries/timetable/useTimetables";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export default function TeacherTimetable() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: schedule, isLoading, isError, refetch } = useMyTeacherSchedule(currentYear?.id ?? "");

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">My Timetable</h1>
          <p className="os-page__subtitle">{currentYear?.label ?? ""}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="os-section" style={{ padding: "1.5rem" }}>
          <SkeletonText width="40%" />
        </div>
      ) : isError ? (
        <div className="os-section">
          <ErrorMessage message="Could not load your timetable." onRetry={refetch} />
        </div>
      ) : !schedule || schedule.length === 0 ? (
        <div className="os-section">
          <EmptyState title="No published classes yet" description="Your teaching schedule will appear here once a timetable is published." />
        </div>
      ) : (
        DAYS.map((day) => {
          const entries = schedule
            .filter((e) => e.day_of_week === day.value)
            .sort((a, b) => a.period_number - b.period_number);
          if (entries.length === 0) return null;
          return (
            <div key={day.value} className="os-section">
              <div className="os-section__header">
                <h2 className="os-section__title">{day.label}</h2>
              </div>
              <table className="os-table">
                <thead>
                  <tr>
                    <th style={{ width: "6rem" }}>Period</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Classroom</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i}>
                      <td>P{e.period_number}</td>
                      <td>{e.subject_name ?? <span className="os-table__muted">-</span>}</td>
                      <td>
                        {e.grade_name} - {e.class_name}
                      </td>
                      <td>{e.classroom_name ?? <span className="os-table__muted">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
