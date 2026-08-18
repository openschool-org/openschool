// This file renders the StudentTimetable page, displaying the weekly class scheduling and period listings.

import { useMyClassTimetable } from "../../queries/timetable/useTimetables";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

export default function StudentTimetable() {
  const { data, isLoading, isError } = useMyClassTimetable();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ padding: "2rem" }}>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Class Timetable</h2>
        </div>
        <div className="os-section__body" style={{ display: "grid", gap: "1.5rem" }}>
          {isError || !data ? (
            <EmptyState
              title="No published timetable yet"
              description="Your class timetable will appear here once it's published by the admin."
            />
          ) : (
            WEEKDAYS.map((day) => {
              const entries = data.entries
                .filter((e) => e.day_of_week === day.value)
                .sort((a, b) => a.period_number - b.period_number);
              if (entries.length === 0) return null;
              return (
                <div key={day.value}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, margin: "0 0 0.5rem" }}>{day.label}</h3>
                  <table className="os-table os-table--no-hover">
                    <thead>
                      <tr>
                        <th style={{ width: "6rem" }}>Period</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Classroom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id}>
                          <td>P{e.period_number}</td>
                          <td>{e.subject_name ?? "—"}</td>
                          <td>{e.teacher_name ?? "—"}</td>
                          <td>{e.classroom_name ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
