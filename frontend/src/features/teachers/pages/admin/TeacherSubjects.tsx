import { useState } from "react";
import { Tag, SkeletonText, Pagination, Button, IconButton, InlineNotification } from "@carbon/react";
import { Add, Close } from "@carbon/icons-react";
import { Link } from "react-router";
import { useTeachers, useTeacherSubjects, useAssignTeacherSubject, useRemoveTeacherSubject } from "@/features/teachers/queries/useTeachers";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useDebounced } from "@/shared/hooks/useDebounced";
import type { Teacher, TeacherSubject } from "@/features/teachers/api/teacher";
import type { Subject } from "@/features/curriculum/api/subject";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AssignTeacherSubjectModal from "@/features/teachers/components/AssignTeacherSubjectModal";
import FilterBar from "@/shared/ui/FilterBar";
import SectionCard from "@/shared/ui/SectionCard";
import Avatar from "@/shared/ui/Avatar";

function TeacherSubjectRow({ teacher, allSubjects }: { teacher: Teacher; allSubjects: Subject[] }) {
  const { data: assignedSubjects, isLoading, isError } = useTeacherSubjects(teacher.id);
  const assignMutation = useAssignTeacherSubject(teacher.id);
  const removeMutation = useRemoveTeacherSubject(teacher.id);
  const [subjectToRemove, setSubjectToRemove] = useState<TeacherSubject | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const confirmRemove = () => {
    if (!subjectToRemove) return;
    removeMutation.mutate(subjectToRemove.id);
  };

  const assignedIds = new Set(assignedSubjects?.map((s) => s.id) ?? []);
  const assignableSubjects = allSubjects.filter((s) => !assignedIds.has(s.id));

  return (
    <tr>
      <td>
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={teacher.full_name} size="sm" />
          <span className="os-fw-500">{teacher.full_name}</span>
        </div>
      </td>
      <td className="os-table__mono">{teacher.employee_number}</td>
      <td>
        {isLoading ? (
          <SkeletonText width="6rem" />
        ) : isError ? (
          <span className="os-c-danger os-text-md">Error loading subjects</span>
        ) : !assignedSubjects || assignedSubjects.length === 0 ? (
          <span className="os-text-md os-c-tertiary">No subjects assigned</span>
        ) : (
          <div className="os-flex os-items-center os-wrap os-gap-2">
            {assignedSubjects.map((s) => (
              <div key={s.id} className="os-flex os-items-center os-gap-1">
                <Tag type="blue" size="sm">{s.name}</Tag>
                <IconButton
                  label={`Remove ${s.name}`}
                  kind="ghost"
                  size="sm"
                  onClick={() => setSubjectToRemove(s)}
                >
                  <Close size={14} />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </td>
      <td>
        <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setAssignOpen(true)} disabled={assignableSubjects.length === 0}>
          Assign subject
        </Button>
        {assignableSubjects.length === 0 && !isLoading && !isError && (
          <p role="status" className="os-m-0 os-mt-1 os-text-xs os-c-tertiary">All subjects assigned</p>
        )}
        {assignMutation.isError && (
          <div className="os-c-danger os-text-xs os-mt-1">
            Failed to assign
          </div>
        )}
        {removeMutation.isError && (
          <div className="os-c-danger os-text-xs os-mt-1">
            Failed to remove
          </div>
        )}
      </td>
      <ConfirmDeleteModal
        open={!!subjectToRemove}
        title="Remove subject"
        description={
          <>
            Remove <strong>{subjectToRemove?.name}</strong> from {teacher.full_name}&apos;s assigned subjects?
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        subject="Subject"
        successVerb="removed"
        mutation={removeMutation}
        onClose={() => setSubjectToRemove(null)}
        onConfirm={confirmRemove}
      />
      <AssignTeacherSubjectModal
        open={assignOpen}
        teacher={teacher}
        subjects={assignableSubjects}
        mutation={assignMutation}
        onClose={() => setAssignOpen(false)}
      />
    </tr>
  );
}

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
        <div className="os-flex os-items-start os-gap-3 os-mb-6">
          <InlineNotification
            kind="error"
            title="Could not load the subject catalogue"
            subtitle="Teacher records are still available below. Retry the catalogue, or open Subjects & curriculum to configure and save subjects first."
            lowContrast
            className="os-flex-1 os-m-0"
          />
          <Button kind="ghost" size="sm" onClick={() => refetchSubjects()}>Retry</Button>
        </div>
      ) : subjects && subjects.length === 0 ? (
        <div className="os-flex os-items-start os-gap-3 os-mb-6">
          <InlineNotification
            kind="info"
            title="Add subjects before assigning teachers"
            subtitle="Open Subjects & curriculum, configure the relevant grade groups, and save the subjects. They will then be available here for teacher assignments."
            lowContrast
            className="os-flex-1 os-m-0"
          />
          <Button kind="ghost" size="sm" as={Link} to="/subjects">Open Subjects & curriculum</Button>
        </div>
      ) : null}

      <FilterBar
        search={{
          value: searchQuery,
          onChange: (value) => { setSearchQuery(value); setPage(1); },
          placeholder: "Search teachers by name or employee number…",
        }}
      />

      <SectionCard
        title="Teacher qualifications"
        meta={!loadingTeachers && (
          <span className="os-section__meta">
            {normalizedSearch ? `${totalItems} matching` : `${totalItems} teachers`}
          </span>
        )}
        flush
      >
        <table className="os-table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Employee #</th>
              <th>Assigned subjects</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingTeachers ? (
              <tr>
                <td colSpan={4} className="os-text-center os-c-tertiary os-p-8">
                  <SkeletonText width="8rem" />
                </td>
              </tr>
            ) : visibleTeachers.length === 0 ? (
              <tr>
                <td colSpan={4} className="os-text-center os-c-tertiary os-p-8">
                  No teachers found matching your search.
                </td>
              </tr>
            ) : (
              visibleTeachers.map((t) => (
                <TeacherSubjectRow key={t.id} teacher={t} allSubjects={subjects ?? []} />
              ))
            )}
          </tbody>
        </table>

        {!loadingTeachers && totalItems > 0 && (
          <Pagination
            totalItems={totalItems}
            page={page}
            pageSize={pageSize}
            pageSizes={[25, 50, 100]}
            onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
            size="sm"
          />
        )}
      </SectionCard>
    </div>
  );
}
