import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Tag } from "@carbon/react";
import { useSubjects, useUpdateSubject, useDeleteSubject } from "@/features/curriculum/queries/useSubjects";
import type { Subject } from "@/features/curriculum/api/subject";
import EditSubjectModal, { type SubjectForm } from "@/features/curriculum/components/EditSubjectModal";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useListFilters } from "@/shared/hooks/useListFilters";

export default function SubjectsPanel() {
  const { data: subjects, isLoading, isError, refetch } = useSubjects();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const { filters, set, debouncedSearch } = useListFilters({ query: "" });

  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>({ name: "", code: "", type: "", max_marks: 100 });
  const [touched, setTouched] = useState<{ name?: boolean; code?: boolean }>({});
  const [toDelete, setToDelete] = useState<Subject | null>(null);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return (subjects ?? []).filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.type ?? "").toLowerCase().includes(q));
  }, [subjects, debouncedSearch]);
  const searching = debouncedSearch.trim().length > 0;

  const openEdit = (s: Subject) => {
    updateSubject.reset();
    setForm({ name: s.name, code: s.code, type: s.type ?? "", max_marks: s.max_marks });
    setTouched({});
    setEditing(s);
  };

  const update = () => {
    setTouched({ name: true, code: true });
    if (!editing || !form.name.trim() || !form.code.trim()) return;
    updateSubject.mutate(
      { id: editing.id, data: { name: form.name.trim(), code: form.code.trim(), type: form.type.trim(), max_marks: form.max_marks } },
      { onSuccess: () => setEditing(null) },
    );
  };

  const columns: GridColumn<Subject>[] = [
    { key: "code", header: "Code", render: (s) => <span className="os-table__mono">{s.code}</span> },
    { key: "name", header: "Subject", render: (s) => s.name },
    { key: "type", header: "Type", render: (s) => (s.type ? <Tag type="blue" size="sm">{s.type}</Tag> : <span className="os-table__muted">-</span>) },
    { key: "max", header: "Max marks", render: (s) => s.max_marks },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (s) => (
        <div className="os-grid__actions">
          <IconButton label="Edit" kind="ghost" size="sm" onClick={() => openEdit(s)}><Edit /></IconButton>
          <IconButton label="Delete" kind="ghost" size="sm" onClick={() => setToDelete(s)}><TrashCan /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="os-flex os-items-center os-justify-between os-gap-4 os-wrap os-my-4">
        <p className="os-m-0 os-text-sm os-c-secondary">The school's subject catalogue. Offer a subject to students by adding it to a selection group under the curriculum tab.</p>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/subjects/new">Add subject</Button>
      </div>

      <div className="os-section">
        <FilterBar search={{ value: filters.query, onChange: (v) => set("query", v), placeholder: "Search by name, code or type…" }} />
        <MutationErrorNotification isError={deleteSubject.isError} error={deleteSubject.error} title="Could not delete subject" fallback="The subject may be in use by a class or curriculum group." onClose={() => deleteSubject.reset()} className="os-section__notice" />
        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={filtered.length === 0}
          errorMessage="Failed to load subjects"
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{
            title: searching ? "No subjects found" : "No subjects yet",
            description: searching ? `No subject matches "${debouncedSearch}".` : "Add the subjects your school teaches to get started.",
            action: searching ? undefined : <Button renderIcon={Add} kind="primary" as={Link} to="/subjects/new">Add subject</Button>,
          }}
        >
          <DataGrid rows={filtered} columns={columns} getRowId={(s) => s.id} countLabel={(shown, total) => `Showing ${shown} of ${total} subjects`} />
        </ListState>
      </div>

      {editing && (
        <EditSubjectModal form={form} onChange={setForm} touched={touched} onTouch={(f) => setTouched((t) => ({ ...t, [f]: true }))} isPending={updateSubject.isPending} isError={updateSubject.isError} error={updateSubject.error} onClose={() => setEditing(null)} onSubmit={update} />
      )}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete subject"
        description={<>Delete <strong>{toDelete?.name}</strong> ({toDelete?.code})? This cannot be undone, and is blocked if the subject is used by a class or curriculum group.</>}
        subject="Subject"
        mutation={deleteSubject}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteSubject.mutate(toDelete.id)}
      />
    </div>
  );
}
