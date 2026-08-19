// Principal/Vice Principal's "every class's timetable" monitoring view — a
// read-only cut of the admin Timetables list (no create/copy/revise/delete),
// backed by the leadership self-service endpoint.

import { useNavigate } from "react-router";
import { Tag, SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useTimetablesForLeadership } from "../../queries/timetable/useTimetables";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";

const STATUS_TAG: Record<string, { type: "gray" | "blue" | "green" | "teal" | "red" | "magenta"; label: string }> = {
  draft: { type: "gray", label: "Draft" },
  under_review: { type: "blue", label: "Under Review" },
  approved: { type: "teal", label: "Approved" },
  published: { type: "green", label: "Published" },
  rejected: { type: "red", label: "Rejected" },
  archived: { type: "magenta", label: "Archived" },
};

export default function TeacherTimetables() {
  const navigate = useNavigate();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: timetables, isLoading, isError, refetch } = useTimetablesForLeadership();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">All Timetables</h1>
          <p className="os-page__subtitle">
            Every class timetable for {currentYear?.label ?? "the current academic year"}.
          </p>
        </div>
      </div>

      <div className="os-section" style={{ padding: "1.5rem" }}>
        {isLoading ? (
          <SkeletonText width="40%" />
        ) : isError ? (
          <ErrorMessage message="Could not load timetables." onRetry={refetch} />
        ) : !timetables || timetables.length === 0 ? (
          <EmptyState title="No timetables yet" description="No class timetables have been created for this academic year." />
        ) : (
          <table className="os-table">
            <thead>
              <tr>
                <th>Grade</th>
                <th>Class</th>
                <th>Version</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {timetables.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/timetables/${t.id}`)}>
                  <td>{t.grade_name}</td>
                  <td>{t.class_name}</td>
                  <td>v{t.version}</td>
                  <td>
                    <Tag type={STATUS_TAG[t.status]?.type ?? "gray"} size="sm">
                      {STATUS_TAG[t.status]?.label ?? t.status}
                    </Tag>
                  </td>
                  <td>{t.updated_at ? new Date(t.updated_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
