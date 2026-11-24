import { useNavigate } from "react-router";
import Pill from "@/shared/ui/Pill";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import SectionCard from "@/shared/ui/SectionCard";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTimetablesForLeadership } from "@/features/timetable/queries/useTimetables";
import { TIMETABLE_STATUS_TAG, TIMETABLE_STATUS_TONE } from "@/shared/lib/constants/tags";
import DataGrid from "@/shared/ui/DataGrid";
import { formatDayMonthYear } from "@/shared/lib/date";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import PageHeader from "@/shared/ui/PageHeader";

const statusTag = (s: string) => TIMETABLE_STATUS_TAG[s as keyof typeof TIMETABLE_STATUS_TAG];

// Read-only monitoring view of every class timetable for the Principal and Vice Principal.
export default function TeacherTimetables() {
  const navigate = useNavigate();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: timetables, isLoading, isError, refetch } = useTimetablesForLeadership();

  return (
    <div className="os-page">
      <PageHeader title="All timetables" subtitle={`Every class timetable for ${currentYear?.label ?? "this year"}.`} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
      <SectionCard title="Class timetables" meta={<span className="os-text-sm os-c-tertiary">{timetables?.length ?? 0} timetables</span>} flush>
        {isError ? (
          <ErrorMessage message="Could not load timetables." onRetry={refetch} />
        ) : !timetables?.length ? (
          <EmptyState title="No timetables yet" description="No class timetables have been created for this academic year." />
        ) : (
          <DataGrid
            rows={timetables}
            getRowId={(t) => t.id}
            pageSize={20}
            onRowClick={(t) => navigate(`/timetables/${t.id}`)}
            columns={[
              { key: "grade", header: "Grade", render: (t) => t.grade_name },
              { key: "class", header: "Class", render: (t) => t.class_name },
              { key: "version", header: "Version", render: (t) => `v${t.version}` },
              { key: "status", header: "Status", render: (t) => <Pill tone={TIMETABLE_STATUS_TONE[t.status as keyof typeof TIMETABLE_STATUS_TONE] ?? "neutral"}>{statusTag(t.status)?.label ?? t.status}</Pill> },
              { key: "updated", header: "Updated", render: (t) => formatDayMonthYear(t.updated_at) },
            ]}
          />
        )}
      </SectionCard>
      )}
    </div>
  );
}
