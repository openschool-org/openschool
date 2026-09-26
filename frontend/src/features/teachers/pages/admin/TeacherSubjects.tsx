import { useState } from "react";
import { Search, Tag, SkeletonText, Pagination } from "@carbon/react";
import { useTeachers, useTeacherSubjects, useAssignTeacherSubject, useRemoveTeacherSubject } from "@/features/teachers/queries/useTeachers";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useDebounced } from "@/shared/hooks/useDebounced";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import type { Teacher, TeacherSubject } from "@/features/teachers/api/teacher";
import type { Subject } from "@/features/curriculum/api/subject";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";

function TeacherSubjectRow({ teacher, allSubjects }: { teacher: Teacher; allSubjects: Subject[] }) {
  const { data: assignedSubjects, isLoading, isError } = useTeacherSubjects(teacher.id);
  const assignMutation = useAssignTeacherSubject(teacher.id);
  const removeMutation = useRemoveTeacherSubject(teacher.id);
  const [subjectToRemove, setSubjectToRemove] = useState<TeacherSubject | null>(null);

  const handleAssign = (subjectId: string) => {
    if (!subjectId) return;
    assignMutation.mutate(subjectId);
  };

  const confirmRemove = () => {
    if (!subjectToRemove) return;
    removeMutation.mutate(subjectToRemove.id);
  };

  const assignedIds = new Set(assignedSubjects?.map((s) => s.id) ?? []);
  const assignableSubjects = allSubjects.filter((s) => !assignedIds.has(s.id));

  return (
    <tr>
      <td className="os-fw-500">{teacher.full_name}</td>
      <td className="os-table__mono">{teacher.employee_number}</td>
      <td>
        {isLoading ? (
          <SkeletonText width="6rem" />
        ) : isError ? (
          <span className="os-c-danger os-text-md">Error loading subjects</span>
        ) : !assignedSubjects || assignedSubjects.length === 0 ? (
          <span className="os-text-md os-c-tertiary">No subjects assigned</span>
        ) : (
          <div className="os-flex os-wrap os-gap-1">
            {assignedSubjects.map((s) => (
              <Tag
                key={s.id}
                type="blue"
                size="sm"
                title="Click to remove"
                onClick={() => setSubjectToRemove(s)} className="os-pointer"
              >
                {s.name} &times;
              </Tag>
            ))}
          </div>
        )}
      </td>
      <td className="os-min-w-12">
        <EntityCombobox
          id={`assign-subject-${teacher.id}`}
          items={assignableSubjects}
          selectedId=""
          onSelect={handleAssign}
          getId={(s) => s.id}
          itemToString={(s) => `${s.name} (${s.code})`}
          labelText=""
          ariaLabel={`Assign subject to ${teacher.full_name}`}
          placeholder="Assign subject…"
        />
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
  const totalItems = teacherPage?.total ?? 0;
  const { data: subjects, isLoading: loadingSubjects, isError: subjectsError, refetch: refetchSubjects } = useSubjects();

  if (loadingSubjects) {
    return <LoadingSpinner />;
  }

  if (teachersError) {
    return <ErrorMessage message="Could not load teachers." onRetry={refetchTeachers} />;
  }

  if (subjectsError) {
    return <ErrorMessage message="Could not load subjects." onRetry={refetchSubjects} />;
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Teacher subjects</h1>
          <p className="os-page__subtitle">Subjects each teacher is qualified to teach.</p>
        </div>
      </div>

      <div className="os-mb-5 os-max-w-24">
        <Search
          id="teacher-search"
          placeholder="Search teachers by name or employee number…"
          labelText="Search"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
        />
      </div>

      <div className="os-section">
        <table className="os-table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Employee #</th>
              <th>Assigned subjects (click to remove)</th>
              <th>Assign subject</th>
            </tr>
          </thead>
          <tbody>
            {loadingTeachers ? (
              <tr>
                <td colSpan={4} className="os-text-center os-c-tertiary os-p-8">
                  <SkeletonText width="8rem" />
                </td>
              </tr>
            ) : teachers.length === 0 ? (
              <tr>
                <td colSpan={4} className="os-text-center os-c-tertiary os-p-8">
                  No teachers found matching your search.
                </td>
              </tr>
            ) : (
              teachers.map((t) => (
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
      </div>
    </div>
  );
}
