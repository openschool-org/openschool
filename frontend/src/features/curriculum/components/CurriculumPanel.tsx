import { useState } from "react";
import { Add, Rocket } from "@carbon/icons-react";
import { Button, InlineNotification } from "@carbon/react";
import {
  useLevels,
  useCreateLevel,
  useUpdateLevel,
  useDuplicateLevel,
  useDeleteLevel,
} from "@/features/curriculum/queries/useCurriculum";
import { useRunCurriculumPreset } from "@/features/curriculum/queries/useCurriculumPreset";
import { useGrades } from "@/features/academics/queries/useGrades";
import type { Level } from "@/features/curriculum/api/curriculum";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import LevelsList from "@/features/curriculum/components/LevelsList";
import CreateLevelModal from "@/features/curriculum/components/CreateLevelModal";
import EditLevelModal from "@/features/curriculum/components/EditLevelModal";
import DuplicateLevelModal from "@/features/curriculum/components/DuplicateLevelModal";
import PresetConfirmModal from "@/features/curriculum/components/PresetConfirmModal";
import { EMPTY_LEVEL_FORM } from "@/features/curriculum/constants";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

export default function CurriculumPanel() {
  const { data: levels, isLoading, isError, refetch } = useLevels();
  const { data: grades } = useGrades();
  const createLevel = useCreateLevel();
  const updateLevel = useUpdateLevel();
  const duplicateLevel = useDuplicateLevel();
  const deleteLevel = useDeleteLevel();
  const runPreset = useRunCurriculumPreset();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_LEVEL_FORM);
  const [labelTouched, setLabelTouched] = useState(false);
  const [toDelete, setToDelete] = useState<Level | null>(null);
  const [toEdit, setToEdit] = useState<Level | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_LEVEL_FORM);
  const [editLabelTouched, setEditLabelTouched] = useState(false);
  const [toDuplicate, setToDuplicate] = useState<Level | null>(null);
  const [dupForm, setDupForm] = useState(EMPTY_LEVEL_FORM);
  const [dupLabelTouched, setDupLabelTouched] = useState(false);
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);

  const openCreate = () => {
    setForm(EMPTY_LEVEL_FORM);
    setLabelTouched(false);
    createLevel.reset();
    setCreateOpen(true);
  };

  const handleCreate = () => {
    setLabelTouched(true);
    if (!form.label.trim()) return;
    createLevel.mutate(
      {
        label: form.label.trim(),
        grade_id: form.grade_id || undefined,
        sort_order: form.sort_order,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  };

  const openEdit = (l: Level) => {
    updateLevel.reset();
    setEditLabelTouched(false);
    setEditForm({
      label: l.label,
      grade_id: l.grade_id ?? "",
      sort_order: l.sort_order,
    });
    setToEdit(l);
  };

  const handleEdit = () => {
    setEditLabelTouched(true);
    if (!toEdit || !editForm.label.trim()) return;
    updateLevel.mutate(
      {
        id: toEdit.id,
        data: {
          label: editForm.label.trim(),
          grade_id: editForm.grade_id || undefined,
          sort_order: editForm.sort_order,
        },
      },
      { onSuccess: () => setToEdit(null) },
    );
  };

  const openDuplicate = (l: Level) => {
    duplicateLevel.reset();
    setDupLabelTouched(false);
    setDupForm({
      label: `${l.label} (copy)`,
      grade_id: l.grade_id ?? "",
      sort_order: l.sort_order + 1,
    });
    setToDuplicate(l);
  };

  const handleDuplicate = () => {
    setDupLabelTouched(true);
    if (!toDuplicate || !dupForm.label.trim()) return;
    duplicateLevel.mutate(
      {
        id: toDuplicate.id,
        data: {
          label: dupForm.label.trim(),
          grade_id: dupForm.grade_id || undefined,
          sort_order: dupForm.sort_order,
        },
      },
      { onSuccess: () => setToDuplicate(null) },
    );
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteLevel.mutate(toDelete.id);
  };

  return (
    <div>
      <div className="os-flex os-items-center os-justify-between os-gap-4 os-wrap os-my-4 os-mx-0"
      >
        <p className="os-m-0 os-text-sm os-c-secondary">
          A level is any container you name - a grade, a stream, an exam
          stage. Each level holds selection groups that decide what students
          pick from the Subjects tab.
        </p>
        <div className="os-flex os-gap-2">
          <Button
            renderIcon={Rocket}
            kind="secondary"
            size="md"
            onClick={() => {
              runPreset.reset();
              setPresetConfirmOpen(true);
            }}
          >
            Load curriculum preset
          </Button>
          <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
            New level
          </Button>
        </div>
      </div>

      {runPreset.isSuccess && (
        <InlineNotification
          kind="success"
          title="Curriculum preset loaded"
          subtitle={`Created ${runPreset.data.subjects_created} subjects, ${runPreset.data.levels_created} levels, ${runPreset.data.groups_created} selection groups, and ${runPreset.data.links_created} subject links.${
            runPreset.data.grades_skipped?.length
              ? ` Skipped grade(s) ${runPreset.data.grades_skipped.join(", ")} - no matching grade in this school.`
              : ""
          }`}
          lowContrast
          onClose={() => runPreset.reset()} className="os-mb-6 os-max-w-full"
        />
      )}
      <MutationErrorNotification
        isError={runPreset.isError}
        error={runPreset.error}
        title="Could not load preset"
        fallback="Please try again."
        onClose={() => runPreset.reset()} className="os-mb-6"
      />

      <LevelsList
        levels={levels}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        grades={grades}
        deleteLevel={deleteLevel}
        onOpenCreate={openCreate}
        onEdit={openEdit}
        onDuplicate={openDuplicate}
        onRequestDelete={setToDelete}
      />

      <CreateLevelModal
        open={createOpen}
        form={form}
        setForm={setForm}
        labelTouched={labelTouched}
        setLabelTouched={setLabelTouched}
        grades={grades}
        createLevel={createLevel}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <EditLevelModal
        toEdit={toEdit}
        editForm={editForm}
        setEditForm={setEditForm}
        editLabelTouched={editLabelTouched}
        setEditLabelTouched={setEditLabelTouched}
        grades={grades}
        updateLevel={updateLevel}
        onClose={() => setToEdit(null)}
        onSave={handleEdit}
      />

      <DuplicateLevelModal
        toDuplicate={toDuplicate}
        dupForm={dupForm}
        setDupForm={setDupForm}
        dupLabelTouched={dupLabelTouched}
        setDupLabelTouched={setDupLabelTouched}
        grades={grades}
        duplicateLevel={duplicateLevel}
        onClose={() => setToDuplicate(null)}
        onDuplicate={handleDuplicate}
      />

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete level"
        description={
          <>
            Delete <strong>{toDelete?.label}</strong> and all its selection
            groups? This cannot be undone.
          </>
        }
        subject="Level"
        mutation={deleteLevel}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />

      <PresetConfirmModal
        open={presetConfirmOpen}
        runPreset={runPreset}
        onClose={() => setPresetConfirmOpen(false)}
        onLoad={() => runPreset.mutate(undefined, { onSuccess: () => setPresetConfirmOpen(false) })}
      />
    </div>
  );
}
