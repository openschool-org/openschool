import { useMemo, useState } from "react";
import { Button, Card, Segmented, Tag, Tooltip } from "antd";
import { BankOutlined, DeleteOutlined, EditOutlined, ExperimentOutlined, HomeOutlined, PlusOutlined } from "@ant-design/icons";
import { useClassrooms, useCreateClassroom, useUpdateClassroom, useDeleteClassroom } from "@/features/timetable/queries/useClassrooms";
import type { Classroom, ClassroomType } from "@/features/timetable/api/classroom";
import ClassroomFormModal from "@/features/timetable/components/ClassroomFormModal";
import BackfillHomeroomsButton from "@/features/timetable/components/BackfillHomeroomsButton";
import { EMPTY_CLASSROOM_FORM, isLabMissingSubject, type ClassroomForm } from "@/features/timetable/lib/classroomForm";
import { BAND_COLOR, roomBand } from "@/features/timetable/lib/roomKind";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import FilterBar from "@/shared/ui/FilterBar";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";

// The three zones a resource belongs to; the dot colour reuses the school-section palette.
const ZONES: { key: ClassroomType; label: string; description: string; band: string; Icon: typeof HomeOutlined }[] = [
  { key: "regular", label: "Learning block", description: "Homerooms and everyday teaching spaces", band: "primary", Icon: HomeOutlined },
  { key: "lab", label: "Practical learning", description: "Subject labs used for practical lessons", band: "ol", Icon: ExperimentOutlined },
  { key: "eca", label: "Shared facilities", description: "Libraries, halls, arts, sports and support spaces", band: "al", Icon: BankOutlined },
];

const FACILITY_LABEL: Record<string, string> = {
  library: "Library", scienceLab: "Science lab", itLab: "IT lab", technicalLab: "Technical lab",
  homeEconomicsLab: "Home economics lab", languageLab: "Language lab", artRoom: "Art room",
  musicRoom: "Music room", danceRoom: "Dancing room", dramaRoom: "Drama room",
  auditorium: "Auditorium / hall", medicalRoom: "Medical / sick room", counselingRoom: "Counseling room", staffRoom: "Staff room",
};
const FACILITY_LAB_GROUPS = new Set(["scienceLab", "itLab", "technicalLab", "homeEconomicsLab", "languageLab"]);

function resourceType(r: Classroom): ClassroomType {
  if (r.room_type === "eca" && r.code && FACILITY_LAB_GROUPS.has(r.code)) return "lab";
  return r.room_type;
}

function resourceMeta(r: Classroom) {
  if (r.room_type === "regular") return "Homeroom";
  if (r.room_type === "lab") return r.subject_name ? `${r.subject_name} lab` : "Subject lab";
  return r.code ? FACILITY_LABEL[r.code] ?? r.code : "Facility";
}

export default function Resources() {
  const { data: classrooms, isLoading, isError, refetch } = useClassrooms();
  const resources = useMemo(() => classrooms ?? [], [classrooms]);
  const [zone, setZone] = useState<ClassroomType | "all">("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState<ClassroomForm>(EMPTY_CLASSROOM_FORM);
  const [toDelete, setToDelete] = useState<Classroom | null>(null);
  const createResource = useCreateClassroom();
  const updateResource = useUpdateClassroom();
  const deleteResource = useDeleteClassroom();
  const saving = editing ? updateResource : createResource;

  const countOf = (key: ClassroomType) => resources.filter((r) => resourceType(r) === key).length;
  const q = query.trim().toLowerCase();
  const matches = (r: Classroom) => !q || r.name.toLowerCase().includes(q) || resourceMeta(r).toLowerCase().includes(q);

  const openCreate = () => { createResource.reset(); setEditing(null); setForm(EMPTY_CLASSROOM_FORM); setModalOpen(true); };
  const openEdit = (r: Classroom) => {
    updateResource.reset();
    setEditing(r);
    setForm({ name: r.name, code: r.code ?? "", capacity: r.capacity == null ? "" : String(r.capacity), room_type: r.room_type, subject_id: r.subject_id ?? "" });
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim() || isLabMissingSubject(form)) return;
    const data = { name: form.name.trim(), code: editing ? form.code.trim() || undefined : undefined, capacity: form.capacity.trim() ? Number(form.capacity) : null, room_type: form.room_type, subject_id: form.room_type === "lab" ? form.subject_id : null };
    if (editing) updateResource.mutate({ id: editing.id, data }, { onSuccess: () => setModalOpen(false) });
    else createResource.mutate(data, { onSuccess: () => setModalOpen(false) });
  };

  const columns: GridColumn<Classroom>[] = [
    { key: "name", header: "Name", render: (r) => <span className="os-fw-500">{r.name}</span> },
    { key: "type", header: "Type", render: (r) => <Tag color={BAND_COLOR[roomBand(r)]} variant="filled">{resourceMeta(r)}</Tag> },
    { key: "capacity", header: "Capacity", render: (r) => <span className="os-table__muted">{r.capacity == null ? "Not set" : `${r.capacity} places`}</span> },
    {
      key: "actions",
      header: "Actions",
      align: "end",
      render: (r) => (
        <div className="os-grid__actions">
          <Tooltip title={`Edit ${r.name}`}><Button type="text" size="small" aria-label={`Edit ${r.name}`} icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Tooltip title={`Delete ${r.name}`}><Button type="text" size="small" danger aria-label={`Delete ${r.name}`} icon={<DeleteOutlined />} onClick={() => setToDelete(r)} /></Tooltip>
        </div>
      ),
    },
  ];

  const shownZones = ZONES.filter((z) => zone === "all" || zone === z.key)
    .map((z) => ({ ...z, rows: resources.filter((r) => resourceType(r) === z.key && matches(r)) }))
    .filter((z) => !q || z.rows.length > 0);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">School resources</h1>
          <p className="os-page__subtitle">Homerooms, labs, libraries, halls and other facilities in one place.</p>
        </div>
        <div className="os-flex os-gap-3">
          <BackfillHomeroomsButton />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add resource</Button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner label="Loading school resources…" /> : isError ? <ErrorMessage message="Could not load school resources." onRetry={refetch} /> : (
        <>
          <div className="os-stat-grid os-grid-cols-3">
            {ZONES.map(({ key, label, Icon }) => (
              <Card key={key} className="os-dash-stat">
                <p className="os-dash-stat__label"><Icon />{label}</p>
                <p className="os-dash-stat__value">{countOf(key)}</p>
              </Card>
            ))}
          </div>

          <div className="os-grades-filter">
            <FilterBar
              search={{ value: query, onChange: setQuery, placeholder: "Search rooms and facilities…" }}
              controls={[{
                label: "Zone",
                node: (
                  <Segmented
                    value={zone}
                    onChange={(v) => setZone(v as ClassroomType | "all")}
                    options={[{ value: "all", label: `All ${resources.length}` }, ...ZONES.map((z) => ({ value: z.key, label: `${z.label} ${countOf(z.key)}` }))]}
                  />
                ),
              }]}
            />
          </div>

          {shownZones.length === 0 ? (
            <div className="os-section"><EmptyState title="No matching resources" description="Try another name, or a different zone." /></div>
          ) : (
            <div className="os-flex os-col os-gap-4">
              {shownZones.map((z) => (
                <Card
                  key={z.key}
                  className={`os-grade-card os-grade-band--${z.band}`}
                  title={
                    <div className="os-flex os-items-center os-gap-3 os-min-w-0">
                      <span className="os-truncate">{z.label}</span>
                      <Tag variant="filled">{z.rows.length}</Tag>
                      <span className="os-resource-zone__desc">{z.description}</span>
                    </div>
                  }
                >
                  {z.rows.length === 0 ? (
                    <p className="os-grade-card__empty">No resources here yet.</p>
                  ) : (
                    <DataGrid rows={z.rows} columns={columns} getRowId={(r) => r.id} pagination={false} />
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {modalOpen && <ClassroomFormModal editing={!!editing} form={form} onChange={setForm} isPending={saving.isPending} isError={saving.isError} error={saving.error} onClose={() => setModalOpen(false)} onSubmit={save} />}
      <ConfirmDeleteModal open={!!toDelete} title="Delete resource" description={<>Delete <strong>{toDelete?.name}</strong>? This cannot be undone.</>} subject="Resource" mutation={deleteResource} onClose={() => setToDelete(null)} onConfirm={() => toDelete && deleteResource.mutate(toDelete.id)} />
    </div>
  );
}
