import { useState } from "react";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Tag } from "@carbon/react";
import { useClassrooms, useCreateClassroom, useUpdateClassroom, useDeleteClassroom } from "@/features/timetable/queries/useClassrooms";
import type { Classroom, ClassroomType } from "@/features/timetable/api/classroom";
import ClassroomFormModal from "@/features/timetable/components/ClassroomFormModal";
import { EMPTY_CLASSROOM_FORM, isLabMissingSubject, type ClassroomForm } from "@/features/timetable/lib/classroomForm";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

const TYPE_LABEL: Record<ClassroomType, string> = { regular: "Regular", lab: "Lab", eca: "ECA" };
const TYPE_TAG: Record<ClassroomType, "gray" | "purple" | "teal"> = { regular: "gray", lab: "purple", eca: "teal" };

export default function Classrooms({ inline = false }: { inline?: boolean }) {
  const { data: classrooms, isLoading, isError, refetch } = useClassrooms();
  const createClassroom = useCreateClassroom();
  const updateClassroom = useUpdateClassroom();
  const deleteClassroom = useDeleteClassroom();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState<ClassroomForm>(EMPTY_CLASSROOM_FORM);
  const [toDelete, setToDelete] = useState<Classroom | null>(null);
  const saving = editing ? updateClassroom : createClassroom;

  const openCreate = () => {
    createClassroom.reset();
    setForm(EMPTY_CLASSROOM_FORM);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: Classroom) => {
    updateClassroom.reset();
    setForm({ name: c.name, code: c.code ?? "", capacity: c.capacity != null ? String(c.capacity) : "", room_type: c.room_type, subject_id: c.subject_id ?? "" });
    setEditing(c);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name.trim() || isLabMissingSubject(form)) return;
    const data = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
      room_type: form.room_type,
      subject_id: form.room_type === "lab" ? form.subject_id : null,
    };
    const close = { onSuccess: () => setModalOpen(false) };
    if (editing) updateClassroom.mutate({ id: editing.id, data }, close);
    else createClassroom.mutate(data, close);
  };

  const columns: GridColumn<Classroom>[] = [
    { key: "name", header: "Name", render: (c) => c.name },
    { key: "code", header: "Code", render: (c) => c.code || <span className="os-table__muted">-</span> },
    { key: "capacity", header: "Capacity", render: (c) => c.capacity ?? <span className="os-table__muted">-</span> },
    { key: "type", header: "Type", render: (c) => <Tag type={TYPE_TAG[c.room_type]} size="sm">{TYPE_LABEL[c.room_type]}{c.room_type === "lab" && c.subject_name ? ` - ${c.subject_name}` : ""}</Tag> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (c) => (
        <div className="os-grid__actions">
          <IconButton label="Edit" kind="ghost" size="sm" onClick={() => openEdit(c)}><Edit /></IconButton>
          <IconButton label="Delete" kind="ghost" size="sm" onClick={() => setToDelete(c)}><TrashCan /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Classrooms &amp; facilities</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Homerooms, labs and other rooms used in timetables.
              <InfoTip>Rooms are booked into periods so two classes never clash.</InfoTip>
            </div>
          </div>
          <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>Add classroom</Button>
        </div>
      )}
      {inline && (
        <div className="os-flex os-justify-between os-items-center os-mb-4 os-wrap os-gap-4">
          <p className="os-m-0 os-text-md os-c-secondary">Regular homerooms, subject-tagged labs, and ECA facilities.</p>
          <Button renderIcon={Add} kind="primary" size="sm" onClick={openCreate}>Add classroom</Button>
        </div>
      )}

      <div className="os-section">
        <MutationErrorNotification isError={deleteClassroom.isError} error={deleteClassroom.error} title="Could not delete classroom" fallback="It may still be used by a timetable." onClose={() => deleteClassroom.reset()} className="os-section__notice os-mt-4" />
        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={!classrooms?.length}
          errorMessage="Failed to load classrooms"
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "No classrooms yet", description: "Add rooms/labs so the timetable editor can assign them to periods.", action: <Button renderIcon={Add} kind="primary" onClick={openCreate}>Add classroom</Button> }}
        >
          <DataGrid rows={classrooms ?? []} columns={columns} getRowId={(c) => c.id} pageSize={20} countLabel={(shown, total) => `Showing ${shown} of ${total} rooms`} />
        </ListState>
      </div>

      {modalOpen && <ClassroomFormModal editing={!!editing} form={form} onChange={setForm} isPending={saving.isPending} isError={saving.isError} error={saving.error} onClose={() => setModalOpen(false)} onSubmit={save} />}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete classroom"
        description={<>Delete <strong>{toDelete?.name}</strong>? This cannot be undone.</>}
        subject="Classroom"
        mutation={deleteClassroom}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteClassroom.mutate(toDelete.id)}
      />
    </div>
  );
}
