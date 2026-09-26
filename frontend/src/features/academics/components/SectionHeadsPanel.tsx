import { useMemo, useState } from "react";
import { UserFollow } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useCurrentClasses, useStreams } from "@/features/academics/queries/useClasses";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTeacher, useTeachers } from "@/features/teachers/queries/useTeachers";
import type { Teacher } from "@/features/teachers/api/teacher";
import { useSectionHeads, useAssignSectionHead, useRemoveSectionHead } from "@/features/teachers/queries/useSectionHeads";
import type { SectionHead } from "@/features/teachers/api/sectionHead";
import EmptyState from "@/shared/ui/EmptyState";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

interface Row {
  key: string;
  gradeId: string;
  gradeName: string;
  streamId: string | null;
  streamName: string | null;
}

// One row per grade, or per stream in a grade that has streamed classes.
function useSectionHeadRows() {
  const { data: classes } = useCurrentClasses();
  const { data: streams } = useStreams();
  return useMemo(() => {
    const byGrade = new Map<string, { gradeName: string; streamIds: Map<string, string> }>();
    for (const c of classes ?? []) {
      if (!byGrade.has(c.grade_id)) byGrade.set(c.grade_id, { gradeName: c.grade_name, streamIds: new Map() });
      if (c.stream_id) byGrade.get(c.grade_id)!.streamIds.set(c.stream_id, streams?.find((s) => s.id === c.stream_id)?.name ?? "Stream");
    }
    const rows: Row[] = [];
    for (const [gradeId, { gradeName, streamIds }] of byGrade) {
      if (streamIds.size === 0) rows.push({ key: gradeId, gradeId, gradeName, streamId: null, streamName: null });
      else for (const [streamId, streamName] of streamIds) rows.push({ key: `${gradeId}-${streamId}`, gradeId, gradeName, streamId, streamName });
    }
    return rows.sort((a, b) => a.gradeName.localeCompare(b.gradeName) || (a.streamName ?? "").localeCompare(b.streamName ?? ""));
  }, [classes, streams]);
}

export default function SectionHeadsPanel() {
  const { data: currentYear } = useCurrentAcademicYear();
  // One search box's worth of state shared by every row's combobox below -
  // each row assigns a different grade/stream, but they all pick from the
  // same searched teacher list, so typing in one narrows all of them.
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const teachers = teacherPage?.items;
  const { data: sectionHeads } = useSectionHeads(currentYear?.id ?? "");
  const assign = useAssignSectionHead();
  const remove = useRemoveSectionHead();
  const rows = useSectionHeadRows();
  const [toRemove, setToRemove] = useState<SectionHead | null>(null);

  const headFor = (row: Row) => sectionHeads?.find((sh) => sh.grade_id === row.gradeId && sh.stream_id === row.streamId);

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Section heads (teachers in charge)</h2>
        {currentYear && <span className="os-text-xs os-c-tertiary">{currentYear.label}</span>}
      </div>

      {!currentYear ? (
        <EmptyState title="No current academic year" description="Set an academic year as current before assigning section heads." />
      ) : rows.length === 0 ? (
        <EmptyState title="No classes yet" description="Section heads are derived from the grades and streams your classes actually use." />
      ) : (
        rows.map((row) => (
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
        ))
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
    </div>
  );
}

interface SectionHeadRowProps {
  row: Row;
  head: SectionHead | undefined;
  teachers: Teacher[];
  onSearch: (term: string) => void;
  onAssign: (teacherId: string) => void;
  onRemoveClick: (head: SectionHead) => void;
  removeDisabled: boolean;
}

// One row's own component so it can fetch its own current teacher by id -
// the shared search-page `teachers` list may not contain it (no search
// typed yet, or a term that doesn't match), which would otherwise resolve
// the combobox to no selection and show an empty field for an existing
// appointment.
function SectionHeadRow({ row, head, teachers, onSearch, onAssign, onRemoveClick, removeDisabled }: SectionHeadRowProps) {
  const { data: currentTeacher } = useTeacher(head?.teacher_id ?? "");
  const items = useMemo(
    () => (currentTeacher && !teachers.some((t) => t.id === currentTeacher.id) ? [currentTeacher, ...teachers] : teachers),
    [teachers, currentTeacher],
  );

  return (
    <div className="os-list-row os-py-3 os-px-6">
      <UserFollow size={16} className="os-fill-tertiary os-shrink-0" />
      <div className="os-flex-1 os-min-w-0">
        <p className="os-m-0 os-text-md os-fw-500 os-c-primary">{row.gradeName}{row.streamName ? ` - ${row.streamName}` : ""}</p>
        {head && <p className="os-m-0 os-text-xs os-c-secondary">Current: {head.teacher_name}</p>}
      </div>
      <div className="os-w-16">
        <EntityCombobox
          id={`tic-${row.key}`}
          items={items}
          selectedId={head?.teacher_id ?? ""}
          onSelect={(teacher_id) => teacher_id && onAssign(teacher_id)}
          onSearch={onSearch}
          getId={(t) => t.id}
          itemToString={(t) => `${t.full_name} - ${t.employee_number}`}
          placeholder="Search teachers…"
        />
      </div>
      {/* Vacating a post is only possible by removing the appointment. */}
      <Button kind="danger--ghost" size="sm" onClick={() => head && onRemoveClick(head)} disabled={!head || removeDisabled}>Remove</Button>
    </div>
  );
}
