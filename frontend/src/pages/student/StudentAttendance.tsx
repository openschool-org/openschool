// This file renders the StudentAttendance page, displaying a historical log of the student's attendance records.

import { Tag } from "@carbon/react";
import { useMyAttendance } from "../../queries/useStudentSelf";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

const STATUS_TAG: Record<string, "green" | "red" | "warm-gray" | "blue"> = {
  present: "green",
  absent: "red",
  late: "warm-gray",
  excused: "blue",
};

export default function StudentAttendance() {
  const { data: records, isLoading } = useMyAttendance();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div style={{ padding: "2rem" }}>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Attendance History</h2>
        </div>
        <div className="os-section__body" style={{ padding: 0 }}>
          {!records || records.length === 0 ? (
            <div style={{ padding: "2rem" }}>
              <EmptyState
                title="No attendance recorded yet"
                description="Records will show up here once a class session is marked."
              />
            </div>
          ) : (
            <table className="os-table os-table--no-hover">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {[...records]
                  .sort((a, b) => b.session_date.localeCompare(a.session_date))
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="os-table__mono">{r.session_date}</td>
                      <td>{r.class_name}</td>
                      <td>
                        <Tag type={STATUS_TAG[r.status] ?? "gray"} size="sm">
                          {r.status[0].toUpperCase() + r.status.slice(1)}
                        </Tag>
                      </td>
                      <td className="os-table__muted">{r.note || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
