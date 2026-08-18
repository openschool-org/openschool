// This file renders the StudentProgress page, showing the teacher's narrative remarks and progress reports for the student.

import { useMyStudentProfile } from "../../queries/useStudentSelf";
import { useProgressReports } from "../../queries/useStudentPortfolio";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";

export default function StudentProgress() {
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useMyStudentProfile();
  const { data: reports, isLoading: reportsLoading, isError: reportsError, refetch: refetchReports } = useProgressReports(profile?.id ?? "");

  if (profileLoading || reportsLoading) return <LoadingSpinner />;
  if (profileError || reportsError) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load progress reports" onRetry={() => { refetchProfile(); refetchReports(); }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Narrative Progress Reports</h2>
        </div>
        <div className="os-section__body" style={{ padding: 0 }}>
          {!reports || reports.length === 0 ? (
            <div style={{ padding: "2rem" }}>
              <EmptyState
                title="No progress reports yet"
                description="Your narrative reports will show up here once created by your teachers."
              />
            </div>
          ) : (
            <table className="os-table">
              <thead>
                <tr>
                  <th>Term</th>
                  <th>Narrative Remarks</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.term_name || "—"}</td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{r.narrative}</td>
                    <td className="os-table__mono" style={{ fontSize: "0.75rem" }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                    </td>
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
