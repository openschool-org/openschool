import { useState } from "react";
import { Alert, Button } from "antd";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useDebounced } from "@/shared/hooks/useDebounced";
import type { Teacher } from "@/features/teachers/api/teacher";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import LinkButton from "@/shared/ui/LinkButton";
import FilterBar from "@/shared/ui/FilterBar";
import SectionCard from "@/shared/ui/SectionCard";
import Avatar from "@/shared/ui/Avatar";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import { AssignedSubjectsCell, AssignSubjectCell } from "@/features/teachers/components/TeacherSubjectCells";
import { displayName } from "@/shared/lib/name";

export default function TeacherSubjects() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounced(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Server-paginated and server-searched (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
  // section 4) - a client-side filter over a capped page could neither find
  // nor act on a teacher past the first page.
  const { data: teacherPage, isLoading: loadingTeachers, isError: teachersError, refetch: refetchTeachers } = useTeachers({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
  });
  const teachers = teacherPage?.items ?? [];
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  // Search is server-side. Keep the retained page visible while the debounced
  // request is in flight instead of filtering stale results with the new term.
  const visibleTeachers = teachers;
  const totalItems = teacherPage?.total ?? 0;
  const { data: subjects, isLoading: loadingSubjects, isError: subjectsError, refetch: refetchSubjects } = useSubjects();

  const columns: GridColumn<Teacher>[] = [
    {
      key: "teacher",
      header: "Teacher",
      render: (t) => (
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={t.full_name} size="sm" />
          <span className="os-fw-500" title={t.full_name}>{displayName(t)}</span>
        </div>
      ),
    },
    { key: "employee_number", header: "Employee #", render: (t) => <span className="os-table__mono">{t.employee_number}</span> },
    { key: "subjects", header: "Assigned subjects", render: (t) => <AssignedSubjectsCell teacher={t} /> },
    { key: "actions", header: "Actions", render: (t) => <AssignSubjectCell teacher={t} allSubjects={subjects ?? []} /> },
  ];

  if (loadingSubjects) {
    return <LoadingSpinner />;
  }

  if (teachersError) {
    return <ErrorMessage message="Could not load teachers." onRetry={refetchTeachers} />;
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Teacher subjects</h1>
          <p className="os-page__subtitle">Subjects each teacher is qualified to teach.</p>
        </div>
      </div>

      {subjectsError ? (
        <Alert
          type="error"
          showIcon
          className="os-mb-6"
          title="Could not load the subject catalogue"
          description="Teacher records are still available below. Retry the catalogue, or open Subjects & curriculum to configure and save subjects first."
          action={<Button size="small" onClick={() => refetchSubjects()}>Retry</Button>}
        />
      ) : subjects && subjects.length === 0 ? (
        <Alert
          type="info"
          showIcon
          className="os-mb-6"
          title="Add subjects before assigning teachers"
          description="Open Subjects & curriculum, configure the relevant grade groups, and save the subjects. They will then be available here for teacher assignments."
          action={<LinkButton to="/subjects" size="small">Open Subjects & curriculum</LinkButton>}
        />
      ) : null}

      <SectionCard
        title="Teacher qualifications"
        meta={!loadingTeachers && (
          <span className="os-section__meta">
            {normalizedSearch ? `${totalItems} matching` : `${totalItems} ${totalItems === 1 ? "teacher" : "teachers"}`}
          </span>
        )}
        flush
      >
        {/* Search sits inside the card, aligned with the table, like the other list pages. */}
        <div className="os-card-search">
          <FilterBar
            search={{
              value: searchQuery,
              onChange: (value) => { setSearchQuery(value); setPage(1); },
              placeholder: "Search teachers by name or employee number…",
            }}
          />
        </div>
        <ListState
          isLoading={loadingTeachers}
          isError={false}
          isEmpty={visibleTeachers.length === 0}
          errorMessage="Could not load teachers."
          onRetry={refetchTeachers}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No teachers found", description: "No teachers found matching your search." }}
        >
          <DataGrid
            rows={visibleTeachers}
            columns={columns}
            getRowId={(t) => t.id}
            pageSizes={[25, 50, 100]}
            server={{ page, pageSize, totalItems, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
          />
        </ListState>
      </SectionCard>
    </div>
  );
}
