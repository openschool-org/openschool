import { useState } from "react";
import { Add, Time, TrashCan } from "@carbon/icons-react";
import {
  Button,
  TextInput,
  MultiSelect,
  Tag,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useGrades } from "../../../queries/useGrades";
import { useTeachers } from "../../../queries/useTeachers";
import {
  useGradeSections,
  useCreateGradeSection,
  useUpdateGradeSection,
  useDeleteGradeSection,
  useAssignGradesToSection,
  useGradeSectionPeriods,
  useSaveGradeSectionPeriods,
  useRegenerateGradeSectionPeriods,
} from "../../../queries/timetable/useGradeSections";
import type { GradeSection, TimetablePeriod } from "../../../services/timetable/gradeSection";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import EntityCombobox from "../../../components/common/EntityCombobox";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

type Form = { name: string; interval_start_time: string; interval_end_time: string; sort_order: number };
const EMPTY_FORM: Form = { name: "", interval_start_time: "10:30", interval_end_time: "11:00", sort_order: 0 };

function PeriodsEditor({ section, onClose }: { section: GradeSection; onClose: () => void }) {
  const { data: periods, isLoading } = useGradeSectionPeriods(section.id);
  const save = useSaveGradeSectionPeriods(section.id);
  const regenerate = useRegenerateGradeSectionPeriods(section.id);
  const [rows, setRows] = useState<Omit<TimetablePeriod, "id">[] | null>(null);

  const active = rows ?? periods ?? [];

  const updateRow = (index: number, patch: Partial<TimetablePeriod>) => {
    const next = [...active];
    next[index] = { ...next[index], ...patch };
    setRows(next);
  };

  const handleSave = () => {
    if (!rows) return;
    save.mutate(rows, { onSuccess: () => setRows(null) });
  };

  return (
    <ComposedModal open size="md" onClose={onClose}>
      <ModalHeader title={`${section.name} — period grid`} />
      <ModalBody>
        {save.isError && (
          <InlineNotification
            kind="error"
            title="Could not save periods"
            subtitle={getErrorMessage(save.error)}
            lowContrast
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "flex-end" }}>
          <Button
            kind="ghost"
            size="sm"
            onClick={() => regenerate.mutate(undefined, { onSuccess: () => setRows(null) })}
            disabled={regenerate.isPending}
          >
            {regenerate.isPending ? "Regenerating…" : "Regenerate from Timetable Settings"}
          </Button>
        </div>
        {isLoading ? (
          <SkeletonText width="60%" />
        ) : active.length === 0 ? (
          <EmptyState
            title="No periods configured"
            description="Configure Timetable Settings for this academic year, then regenerate."
          />
        ) : (
          <table className="os-table">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Period #</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {active.map((p, i) => (
                <tr key={i} style={p.slot_type === "interval" ? { background: "#fff8e1" } : undefined}>
                  <td>{p.slot_type === "interval" ? "Interval" : "Period"}</td>
                  <td>{p.period_number ?? "-"}</td>
                  <td>
                    <TextInput
                      id={`start-${i}`}
                      labelText=""
                      type="time"
                      size="sm"
                      value={p.start_time}
                      onChange={(e) => updateRow(i, { start_time: e.target.value })}
                    />
                  </td>
                  <td>
                    <TextInput
                      id={`end-${i}`}
                      labelText=""
                      type="time"
                      size="sm"
                      value={p.end_time}
                      onChange={(e) => updateRow(i, { end_time: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Close
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={!rows || save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}

export default function GradeSections() {
  const { data: currentYear } = useCurrentAcademicYear();
  const yearId = currentYear?.id ?? "";
  const { data: sections, isLoading, isError, refetch } = useGradeSections(yearId);
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const createSection = useCreateGradeSection();
  const updateSection = useUpdateGradeSection(yearId);
  const deleteSection = useDeleteGradeSection(yearId);
  const assignGrades = useAssignGradesToSection(yearId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GradeSection | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<GradeSection | null>(null);
  const [periodsFor, setPeriodsFor] = useState<GradeSection | null>(null);

  const openCreate = () => {
    createSection.reset();
    setForm(EMPTY_FORM);
    setSelectedGradeIds([]);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: GradeSection) => {
    updateSection.reset();
    setForm({
      name: s.name,
      interval_start_time: s.interval_start_time,
      interval_end_time: s.interval_end_time,
      sort_order: s.sort_order,
    });
    setSelectedGradeIds(s.grade_ids);
    setEditing(s);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !yearId) return;
    if (editing) {
      updateSection.mutate(
        { id: editing.id, data: form },
        {
          onSuccess: () => {
            assignGrades.mutate({ id: editing.id, gradeIds: selectedGradeIds });
            setModalOpen(false);
          },
        },
      );
    } else {
      createSection.mutate(
        { academic_year_id: yearId, grade_ids: selectedGradeIds, ...form },
        { onSuccess: () => setModalOpen(false) },
      );
    }
  };

  const handleAssignHead = (sectionId: string, teacherId: string) => {
    const section = sections?.find((s) => s.id === sectionId);
    if (!section) return;
    updateSection.mutate({
      id: sectionId,
      data: {
        name: section.name,
        interval_start_time: section.interval_start_time,
        interval_end_time: section.interval_end_time,
        sort_order: section.sort_order,
        section_head_teacher_id: teacherId || null,
      },
    });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteSection.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  const pending = editing ? updateSection : createSection;
  const gradeName = (id: string) => grades?.find((g) => g.id === id)?.name ?? id;

  if (!currentYear) {
    return (
      <div className="os-page">
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Grade Sections</h1>
          </div>
        </div>
        <div className="os-section">
          <EmptyState
            title="No current academic year"
            description="Set an academic year as current before configuring grade sections."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Grade Sections</h1>
          <p className="os-page__subtitle">
            Group grades (Primary, Junior Secondary, Senior Secondary, A/L…) with their own interval time, period
            grid, and section head for {currentYear.label}.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          New Section
        </Button>
      </div>

      <div className="os-section">
        {isLoading && (
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <SkeletonText width="40%" />
          </div>
        )}
        {isError && <ErrorMessage message="Could not load grade sections." onRetry={refetch} />}
        {deleteSection.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete section"
            subtitle={getErrorMessage(deleteSection.error)}
            lowContrast
            onClose={() => deleteSection.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {!isLoading && !isError && (!sections || sections.length === 0) && (
          <EmptyState
            title="No grade sections yet"
            description="e.g. Primary (Grades 1-5), Junior Secondary (6-9), Senior Secondary (10-11), Advanced Level (12-13)."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                New Section
              </Button>
            }
          />
        )}

        {!isLoading && sections && sections.length > 0 && (
          <div>
            {sections.map((s, i) => (
              <div
                key={s.id}
                style={{ padding: "1rem 1.5rem", borderBottom: i < sections.length - 1 ? "1px solid #e0e0e0" : "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Time size={16} style={{ fill: "#406AAF" }} />
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{s.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                      Interval {s.interval_start_time}–{s.interval_end_time}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button kind="ghost" size="sm" onClick={() => setPeriodsFor(s)}>
                      Periods
                    </Button>
                    <Button kind="ghost" size="sm" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button kind="ghost" size="sm" renderIcon={TrashCan} iconDescription="Delete" hasIconOnly onClick={() => setToDelete(s)} />
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
                  {s.grade_ids.length === 0 ? (
                    <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>No grades assigned</span>
                  ) : (
                    s.grade_ids.map((gid) => (
                      <Tag key={gid} type="teal" size="sm">
                        {gradeName(gid)}
                      </Tag>
                    ))
                  )}
                </div>

                <div style={{ width: "20rem" }}>
                  <EntityCombobox
                    id={`section-head-${s.id}`}
                    items={teachers ?? []}
                    selectedId={s.section_head_teacher_id ?? ""}
                    onSelect={(id) => handleAssignHead(s.id, id)}
                    getId={(t) => t.id}
                    itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
                    labelText="Section Head"
                    placeholder="Search teachers…"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ComposedModal open={modalOpen} size="md" onClose={() => setModalOpen(false)}>
        <ModalHeader title={editing ? "Edit grade section" : "New grade section"} />
        <ModalBody>
          {pending.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(pending.error)}
              lowContrast
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <TextInput
              id="section-name"
              labelText="Section name"
              placeholder="e.g. Junior Secondary"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <TextInput
                id="section-interval-start"
                labelText="Interval start"
                type="time"
                value={form.interval_start_time}
                onChange={(e) => setForm((f) => ({ ...f, interval_start_time: e.target.value }))}
              />
              <TextInput
                id="section-interval-end"
                labelText="Interval end"
                type="time"
                value={form.interval_end_time}
                onChange={(e) => setForm((f) => ({ ...f, interval_end_time: e.target.value }))}
              />
            </div>
            <MultiSelect
              id="section-grades"
              titleText="Grades in this section"
              label="Select grades…"
              items={grades ?? []}
              itemToString={(g) => g?.name ?? ""}
              selectedItems={(grades ?? []).filter((g) => selectedGradeIds.includes(g.id))}
              onChange={({ selectedItems }) => setSelectedGradeIds((selectedItems ?? []).map((g) => g.id))}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSave} disabled={!form.name.trim() || pending.isPending}>
            {pending.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {periodsFor && <PeriodsEditor section={periodsFor} onClose={() => setPeriodsFor(null)} />}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete grade section"
        description={<>Delete <strong>{toDelete?.name}</strong>? This cannot be undone, and is blocked while grades are still assigned.</>}
        isPending={deleteSection.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
