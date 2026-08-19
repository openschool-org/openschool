import { useState } from "react";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import {
  Button,
  IconButton,
  Tag,
  TextInput,
  NumberInput,
  Select,
  SelectItem,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import {
  useClassrooms,
  useCreateClassroom,
  useUpdateClassroom,
  useDeleteClassroom,
} from "../../../queries/timetable/useClassrooms";
import { useSubjects } from "../../../queries/useSubjects";
import type { Classroom, ClassroomType } from "../../../services/timetable/classroom";
import { getErrorMessage } from "../../../lib/errorMessage";
import TableSkeleton from "../../../components/common/TableSkeleton";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

const HEADERS = ["Name", "Code", "Capacity", "Type", "Actions"];

const TYPE_LABEL: Record<ClassroomType, string> = { regular: "Regular", lab: "Lab", eca: "ECA" };
const TYPE_TAG: Record<ClassroomType, "gray" | "purple" | "teal"> = { regular: "gray", lab: "purple", eca: "teal" };

type Form = { name: string; code: string; capacity: string; room_type: ClassroomType; subject_id: string };
const EMPTY_FORM: Form = { name: "", code: "", capacity: "", room_type: "regular", subject_id: "" };

export default function Classrooms() {
  const { data: classrooms, isLoading, isError, refetch } = useClassrooms();
  const { data: subjects } = useSubjects();
  const createClassroom = useCreateClassroom();
  const updateClassroom = useUpdateClassroom();
  const deleteClassroom = useDeleteClassroom();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [toDelete, setToDelete] = useState<Classroom | null>(null);

  const openCreate = () => {
    createClassroom.reset();
    setForm(EMPTY_FORM);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: Classroom) => {
    updateClassroom.reset();
    setForm({
      name: c.name,
      code: c.code ?? "",
      capacity: c.capacity != null ? String(c.capacity) : "",
      room_type: c.room_type,
      subject_id: c.subject_id ?? "",
    });
    setEditing(c);
    setModalOpen(true);
  };

  const isLabMissingSubject = form.room_type === "lab" && !form.subject_id;

  const handleSave = () => {
    if (!form.name.trim() || isLabMissingSubject) return;
    const data = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
      room_type: form.room_type,
      subject_id: form.room_type === "lab" ? form.subject_id : null,
    };
    if (editing) {
      updateClassroom.mutate({ id: editing.id, data }, { onSuccess: () => setModalOpen(false) });
    } else {
      createClassroom.mutate(data, { onSuccess: () => setModalOpen(false) });
    }
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteClassroom.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  const pending = editing ? updateClassroom : createClassroom;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Classrooms &amp; Facilities</h1>
          <p className="os-page__subtitle">
            Every physical room the school has — regular homerooms, subject-tagged Labs (Science, IT, etc.), and ECA
            facilities like the Library, Music Room or Auditorium. Booked into timetable periods to prevent clashes.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          Add Classroom
        </Button>
      </div>

      <div className="os-section">
        {deleteClassroom.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete classroom"
            subtitle={getErrorMessage(deleteClassroom.error, "It may still be used by a timetable.")}
            lowContrast
            onClose={() => deleteClassroom.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {isLoading ? (
          <TableSkeleton headers={HEADERS} />
        ) : isError ? (
          <ErrorMessage message="Failed to load classrooms" onRetry={refetch} />
        ) : !classrooms || classrooms.length === 0 ? (
          <EmptyState
            title="No classrooms yet"
            description="Add rooms/labs so the timetable editor can assign them to periods."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                Add Classroom
              </Button>
            }
          />
        ) : (
          <table className="os-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Capacity</th>
                <th>Type</th>
                <th style={{ width: "6rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classrooms.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.code || <span className="os-table__muted">-</span>}</td>
                  <td>{c.capacity ?? <span className="os-table__muted">-</span>}</td>
                  <td>
                    <Tag type={TYPE_TAG[c.room_type]} size="sm">
                      {TYPE_LABEL[c.room_type]}
                      {c.room_type === "lab" && c.subject_name ? ` — ${c.subject_name}` : ""}
                    </Tag>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                      <IconButton label="Edit" kind="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Edit />
                      </IconButton>
                      <IconButton label="Delete" kind="ghost" size="sm" onClick={() => setToDelete(c)}>
                        <TrashCan />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ComposedModal open={modalOpen} size="sm" onClose={() => setModalOpen(false)}>
        <ModalHeader title={editing ? "Edit classroom" : "New classroom"} />
        <ModalBody>
          {pending.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(pending.error, "Failed to save classroom")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <TextInput
              id="classroom-name"
              labelText="Room name"
              placeholder="e.g. Room 8A, Science Lab 1"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextInput
              id="classroom-code"
              labelText="Code (optional)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <NumberInput
              id="classroom-capacity"
              label="Capacity (optional)"
              min={0}
              value={form.capacity}
              onChange={(_e, { value }) => setForm((f) => ({ ...f, capacity: value != null ? String(value) : "" }))}
            />
            <Select
              id="classroom-type"
              labelText="Type"
              value={form.room_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, room_type: e.target.value as ClassroomType, subject_id: e.target.value === "lab" ? f.subject_id : "" }))
              }
            >
              <SelectItem value="regular" text="Regular (homeroom)" />
              <SelectItem value="lab" text="Lab" />
              <SelectItem value="eca" text="ECA (Extra-Curricular Activities)" />
            </Select>
            {form.room_type === "lab" && (
              <Select
                id="classroom-subject"
                labelText="Subject this lab is for"
                helperText="The auto-generator only sends this subject's lab periods to this room."
                value={form.subject_id}
                invalid={isLabMissingSubject}
                invalidText="Required for a lab classroom."
                onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
              >
                <SelectItem value="" text="Select subject…" />
                {subjects?.map((s) => (
                  <SelectItem key={s.id} value={s.id} text={s.name} />
                ))}
              </Select>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSave} disabled={!form.name.trim() || isLabMissingSubject || pending.isPending}>
            {pending.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete classroom"
        description={<>Delete <strong>{toDelete?.name}</strong>? This cannot be undone.</>}
        isPending={deleteClassroom.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
