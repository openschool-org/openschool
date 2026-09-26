import { useState } from "react";
import { useNavigate } from "react-router";
import { Add } from "@carbon/icons-react";
import { Button, Tag, SkeletonText, OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { TIMETABLE_STATUS_TAG } from "@/shared/lib/constants/tags";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import { formatDateTime } from "@/shared/lib/date";
import FormModal from "@/shared/ui/FormModal";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import {
  useTimetablesByYear,
  useCreateTimetable,
  useCopyTimetable,
  useReviseTimetable,
  useDeleteTimetable,
} from "@/features/timetable/queries/useTimetables";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import type { TimetableWithClass } from "@/features/timetable/api/timetable";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

const statusTag = (st: string) => TIMETABLE_STATUS_TAG[st as keyof typeof TIMETABLE_STATUS_TAG];

export default function Timetables({ inline = false }: { inline?: boolean }) {
  const navigate = useNavigate();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: classes } = useCurrentClasses();
  const yearId = currentYear?.id ?? "";
  const { data: timetables, isLoading, isError, refetch } = useTimetablesByYear(yearId);
  const createTimetable = useCreateTimetable();
  const copyTimetable = useCopyTimetable();
  const reviseTimetable = useReviseTimetable();
  const deleteTimetable = useDeleteTimetable();

  const [newClassId, setNewClassId] = useState("");

  const [copySource, setCopySource] = useState<TimetableWithClass | null>(null);
  const [copyTargetClassId, setCopyTargetClassId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimetableWithClass | null>(null);

  const handleCreate = () => {
    if (!yearId || !newClassId) return;
    createTimetable.mutate(
      { academic_year_id: yearId, class_id: newClassId },
      { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) },
    );
  };

  const openCopy = (t: TimetableWithClass) => {
    copyTimetable.reset();
    setCopyTargetClassId("");
    setCopySource(t);
  };

  const handleCopy = () => {
    if (!yearId || !copySource || !copyTargetClassId) return;
    copyTimetable.mutate(
      { academic_year_id: yearId, class_id: copyTargetClassId, source_timetable_id: copySource.id },
      { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) },
    );
  };

  const handleRevise = (t: TimetableWithClass) => {
    reviseTimetable.mutate(t.id, { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) });
  };


  const columns: GridColumn<TimetableWithClass>[] = [
    { key: "grade", header: "Grade", render: (t) => t.grade_name },
    { key: "class", header: "Class", render: (t) => t.class_name },
    { key: "version", header: "Version", render: (t) => `v${t.version}` },
    { key: "status", header: "Status", render: (t) => <Tag type={statusTag(t.status)?.type ?? "gray"} size="sm">{statusTag(t.status)?.label ?? t.status}</Tag> },
    { key: "updated", header: "Updated", render: (t) => formatDateTime(t.updated_at) },
    {
      key: "menu",
      header: "",
      align: "end",
      render: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <OverflowMenu size="sm" flipped>
            <OverflowMenuItem itemText="Copy to another class" onClick={() => openCopy(t)} />
            {t.status === "published" && <OverflowMenuItem itemText="Revise (new draft)" onClick={() => handleRevise(t)} />}
            <OverflowMenuItem itemText="Delete" isDelete onClick={() => { deleteTimetable.reset(); setDeleteTarget(t); }} />
          </OverflowMenu>
        </div>
      ),
    },
  ];

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Timetables</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Class timetables for {currentYear?.label ?? "the current academic year"}.
              <InfoTip>Only the published version is shown to teachers, students and guardians.</InfoTip>
            </div>
          </div>
        </div>
      )}

      <div className="os-section os-p-6">
        <div className="os-flex os-gap-3 os-items-end os-mb-6">
          <div className="os-w-20">
            <EntityCombobox
              id="new-timetable-class"
              items={classes ?? []}
              selectedId={newClassId}
              onSelect={setNewClassId}
              getId={(c) => c.id}
              itemToString={(c) => `${c.grade_name} - ${c.name}`}
              labelText="Create a draft timetable for a class"
              placeholder="Search classes…"
            />
          </div>
          <Button renderIcon={Add} kind="primary" onClick={handleCreate} disabled={!newClassId || createTimetable.isPending}>
            {createTimetable.isPending ? "Creating…" : "New draft"}
          </Button>
        </div>

        <MutationErrorNotification
          isError={createTimetable.isError}
          error={createTimetable.error}
          title="Could not create timetable"
          onClose={() => createTimetable.reset()} className="os-mb-4"
        />
        <MutationErrorNotification
          isError={reviseTimetable.isError}
          error={reviseTimetable.error}
          title="Could not revise timetable"
          onClose={() => reviseTimetable.reset()} className="os-mb-4"
        />
        <MutationErrorNotification
          isError={deleteTimetable.isError}
          error={deleteTimetable.error}
          title="Could not delete timetable"
          onClose={() => deleteTimetable.reset()} className="os-mb-4"
        />

        {!currentYear ? (
          <EmptyState title="No current academic year" description="Set an academic year as current first." />
        ) : isLoading ? (
          <SkeletonText width="40%" />
        ) : isError ? (
          <ErrorMessage message="Could not load timetables." onRetry={refetch} />
        ) : !timetables || timetables.length === 0 ? (
          <EmptyState title="No timetables yet" description="Create a draft timetable for a class above to get started." />
        ) : (
          <DataGrid rows={timetables} columns={columns} getRowId={(t) => t.id} pageSize={20} onRowClick={(t) => navigate(`/timetables/${t.id}`)} />
        )}
      </div>

      <FormModal
        open={!!copySource}
        title="Copy timetable"
        onClose={() => setCopySource(null)}
        onSubmit={handleCopy}
        isPending={copyTimetable.isPending}
        pendingLabel="Copying…"
        submitLabel="Copy"
        submitDisabled={!copyTargetClassId}
        isError={copyTimetable.isError}
        error={copyTimetable.error}
        errorFallback="Failed to copy timetable"
      >
        <p className="os-text-sm os-c-secondary os-mb-4">
          Copies {copySource?.grade_name} - {copySource?.class_name}'s periods into a new draft for another class, for example carrying 6A's timetable over to 7A in a new year.
        </p>
        <EntityCombobox id="copy-target-class" labelText="Target class" items={classes ?? []} selectedId={copyTargetClassId} onSelect={setCopyTargetClassId} getId={(c) => c.id} itemToString={(c) => `${c.grade_name} - ${c.name}`} placeholder="Search classes…" />
      </FormModal>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete timetable"
        description={
          <>
            Delete the {deleteTarget?.grade_name} - {deleteTarget?.class_name} v{deleteTarget?.version} timetable?
            This cannot be undone.
          </>
        }
        subject="Timetable"
        mutation={deleteTimetable}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteTimetable.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
