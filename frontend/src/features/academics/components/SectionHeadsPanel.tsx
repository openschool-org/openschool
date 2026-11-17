import { useMemo, useState } from "react";
import { Alert, Button } from "antd";
import { useCurrentClasses, useStreams } from "@/features/academics/queries/useClasses";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useSectionHeads, useAssignSectionHead, useRemoveSectionHead } from "@/features/teachers/queries/useSectionHeads";
import type { SectionHead } from "@/features/teachers/api/sectionHead";
import EmptyState from "@/shared/ui/EmptyState";
import NoCurrentYear from "@/shared/ui/NoCurrentYear";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionCard from "@/shared/ui/SectionCard";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import { sectionHeadRows, sectionHeadsView, type SectionHeadSlot } from "@/features/academics/lib/sectionHeads";
import SectionHeadRow from "@/features/academics/components/SectionHeadRow";

// One row per grade, or per stream in a grade that has streamed classes.
function useSectionHeadRows() {
  const classesQuery = useCurrentClasses();
  const streamsQuery = useStreams();
  const rows = useMemo(() => sectionHeadRows(classesQuery.data ?? [], streamsQuery.data ?? []), [classesQuery.data, streamsQuery.data]);
  return { rows, classesQuery, streamsQuery };
}

export default function SectionHeadsPanel() {
  const { data: currentYear } = useCurrentAcademicYear();
  // One search box's worth of state shared by every row's combobox below -
  // each row assigns a different grade/stream, but they all pick from the
  // same searched teacher list, so typing in one narrows all of them.
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const teachers = teacherPage?.items;
  const { data: sectionHeads, isLoading, isError, refetch } = useSectionHeads(currentYear?.id ?? "");
  const assign = useAssignSectionHead();
  const remove = useRemoveSectionHead();
  const { rows, classesQuery, streamsQuery } = useSectionHeadRows();
  const [toRemove, setToRemove] = useState<SectionHead | null>(null);

  const state = (q: { isLoading: boolean; isError: boolean; data?: unknown }) => ({ isLoading: q.isLoading, isError: q.isError, hasData: !!q.data });
  const view = sectionHeadsView(!!currentYear, { isLoading, isError, hasData: !!sectionHeads }, state(classesQuery), state(streamsQuery), rows.length);
  const headFor = (row: SectionHeadSlot) => sectionHeads?.find((sh) => sh.grade_id === row.gradeId && sh.stream_id === row.streamId);

  return (
    <SectionCard
      title="Section heads"
      meta={currentYear ? <span className="os-section__meta">{currentYear.label}</span> : undefined}
      flush
    >

      {view === "noYear" && <NoCurrentYear before="assigning section heads" />}
      {view === "loading" && <div className="os-py-2"><ListRowSkeleton trailingWidth="12rem" /></div>}
      {view === "headsError" && <div className="os-p-6"><ErrorMessage message="Could not load section heads." onRetry={refetch} /></div>}
      {view === "structureError" && (
        <div className="os-p-6"><ErrorMessage message="Could not load classes and streams." onRetry={() => { void classesQuery.refetch(); void streamsQuery.refetch(); }} /></div>
      )}
      {view === "empty" && <EmptyState title="No classes yet" description="Section heads are derived from the grades and streams your classes actually use." />}
      {view === "rows" && currentYear && (
        <>
          {(classesQuery.isError || streamsQuery.isError || isError) && (
            <div className="os-px-6 os-py-3">
              <Alert
                type="error"
                showIcon
                title="Some section-head data could not refresh"
                description="Showing the last available rows. Retry to get the latest classes, streams, or assignments."
                action={<Button size="small" onClick={() => { void classesQuery.refetch(); void streamsQuery.refetch(); void refetch(); }}>Retry</Button>}
              />
            </div>
          )}
          {rows.map((row) => (
            <SectionHeadRow
              key={row.key}
              row={row}
              head={headFor(row)}
              teachers={teachers ?? []}
              onSearch={setTeacherSearch}
              onAssign={(teacher_id) => assign.mutate({ academic_year_id: currentYear.id, grade_id: row.gradeId, stream_id: row.streamId, teacher_id })}
              onRemoveClick={setToRemove}
              removeDisabled={remove.isPending}
            />
          ))}
        </>
      )}

      <MutationErrorNotification isError={assign.isError} error={assign.error} title="Could not assign section head" fallback="Please try again." onClose={() => assign.reset()} className="os-mx-6" />
      <MutationErrorNotification isError={remove.isError} error={remove.error} title="Could not remove section head" fallback="Please try again." onClose={() => remove.reset()} className="os-mx-6" />

      <ConfirmDeleteModal
        open={!!toRemove}
        title="Remove section head"
        description={
          <>
            Remove <strong>{toRemove?.teacher_name}</strong> as teacher-in-charge of {toRemove?.grade_name}
            {toRemove?.stream_name ? ` - ${toRemove.stream_name}` : ""}? The post is left vacant, and they lose the notification reach the role grants.
          </>
        }
        subject="Section head"
        successVerb="removed"
        mutation={remove}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && currentYear && remove.mutate({ id: toRemove.id, academicYearId: currentYear.id })}
      />
    </SectionCard>
  );
}
