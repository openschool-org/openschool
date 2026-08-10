import { useState } from "react";
import { Link } from "react-router";
import { Add, ChevronRight, Copy, Edit, Layers, Rocket } from "@carbon/icons-react";
import {
  Button,
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
  SkeletonText,
} from "@carbon/react";
import {
  useLevels,
  useCreateLevel,
  useUpdateLevel,
  useDuplicateLevel,
  useDeleteLevel,
} from "../../../queries/useCurriculum";
import { useRunCurriculumPreset } from "../../../queries/useCurriculumPreset";
import { useGrades } from "../../../queries/useGrades";
import type { Level } from "../../../services/curriculum";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function LevelRowSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid #e0e0e0",
        gap: "1rem",
      }}
    >
      <SkeletonText width="1.25rem" />
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: "0.4rem" }}>
          <SkeletonText width="30%" />
        </div>
        <SkeletonText width="15%" />
      </div>
      <SkeletonText width="4rem" />
    </div>
  );
}

const EMPTY_FORM = { label: "", grade_id: "", sort_order: 0 };

export default function Curriculum() {
  const { data: levels, isLoading, isError, refetch } = useLevels();
  const { data: grades } = useGrades();
  const createLevel = useCreateLevel();
  const updateLevel = useUpdateLevel();
  const duplicateLevel = useDuplicateLevel();
  const deleteLevel = useDeleteLevel();
  const runPreset = useRunCurriculumPreset();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [labelTouched, setLabelTouched] = useState(false);
  const [toDelete, setToDelete] = useState<Level | null>(null);
  const [toEdit, setToEdit] = useState<Level | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editLabelTouched, setEditLabelTouched] = useState(false);
  const [toDuplicate, setToDuplicate] = useState<Level | null>(null);
  const [dupForm, setDupForm] = useState(EMPTY_FORM);
  const [dupLabelTouched, setDupLabelTouched] = useState(false);
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);

  const gradeName = (id: string | null) =>
    grades?.find((g) => g.id === id)?.name ?? null;

  const openCreate = () => {
    setForm(EMPTY_FORM);
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
    deleteLevel.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  return (
    <div className="os-page">
      <div
        className="os-page__header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 className="os-page__title">Curriculum</h1>
          <p className="os-page__subtitle">
            A level is any container you name - a grade, a stream, an exam stage.
            Each level holds selection groups that decide what students pick.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            renderIcon={Rocket}
            kind="secondary"
            size="md"
            onClick={() => {
              runPreset.reset();
              setPresetConfirmOpen(true);
            }}
          >
            Load Curriculum Preset
          </Button>
          <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
            New Level
          </Button>
        </div>
      </div>

      {runPreset.isSuccess && (
        <InlineNotification
          kind="success"
          title="Curriculum preset loaded"
          subtitle={`Created ${runPreset.data.subjects_created} subjects, ${runPreset.data.levels_created} levels, ${runPreset.data.groups_created} selection groups, and ${runPreset.data.links_created} subject links.${
            runPreset.data.grades_skipped?.length
              ? ` Skipped grade(s) ${runPreset.data.grades_skipped.join(", ")} — no matching grade in this school.`
              : ""
          }`}
          lowContrast
          onClose={() => runPreset.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}
      {runPreset.isError && (
        <InlineNotification
          kind="error"
          title="Could not load preset"
          subtitle={getErrorMessage(runPreset.error, "Please try again.")}
          lowContrast
          onClose={() => runPreset.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Levels</h2>
          {levels && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
              {levels.length} total
            </span>
          )}
        </div>

        {isLoading && (
          <div>
            {Array.from({ length: 4 }).map((_, i) => (
              <LevelRowSkeleton key={i} />
            ))}
          </div>
        )}
        {isError && (
          <ErrorMessage message="Could not load levels." onRetry={refetch} />
        )}

        {deleteLevel.isError && (
          <InlineNotification
            kind="error"
            title="Could not delete level"
            subtitle={getErrorMessage(
              deleteLevel.error,
              "The level may have students enrolled through its groups.",
            )}
            lowContrast
            onClose={() => deleteLevel.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}

        {!isLoading && !isError && levels?.length === 0 && (
          <EmptyState
            title="No levels yet"
            description="Create a level for each place a distinct set of subject rules applies - for example one per grade, or one per stream."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                New Level
              </Button>
            }
          />
        )}

        {!isLoading && levels && levels.length > 0 && (
          <div>
            {levels.map((l, i) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "1.25rem 1.5rem",
                  borderBottom:
                    i < levels.length - 1 ? "1px solid #e0e0e0" : "none",
                  gap: "1rem",
                }}
              >
                <Layers size={20} style={{ fill: "#406AAF", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: "0 0 0.125rem",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "#161616",
                    }}
                  >
                    {l.label}
                  </p>
                  <p
                    style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}
                  >
                    Order {l.sort_order}
                  </p>
                </div>
                {gradeName(l.grade_id) ? (
                  <Tag type="teal" size="sm">
                    {gradeName(l.grade_id)}
                  </Tag>
                ) : (
                  <Tag type="gray" size="sm">
                    No grade
                  </Tag>
                )}
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={ChevronRight}
                  as={Link}
                  to={`/curriculum/${l.id}`}
                >
                  Configure
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Edit}
                  onClick={() => openEdit(l)}
                >
                  Edit
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Copy}
                  onClick={() => openDuplicate(l)}
                >
                  Duplicate
                </Button>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  onClick={() => setToDelete(l)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <ComposedModal
        open={createOpen}
        size="sm"
        onClose={() => setCreateOpen(false)}
      >
        <ModalHeader title="New level" />
        <ModalBody>
          {createLevel.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(createLevel.error, "Failed to create level")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <TextInput
              id="level-label"
              labelText="Label"
              placeholder="e.g. Grade 10, or Physical Science"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              onBlur={() => setLabelTouched(true)}
              invalid={labelTouched && !form.label.trim()}
              invalidText="A label is required."
            />
            <Select
              id="level-grade"
              labelText="Grade (optional)"
              helperText="Link this level to a grade, or leave unset for tracks that span grades."
              value={form.grade_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, grade_id: e.target.value }))
              }
            >
              <SelectItem value="" text="No grade" />
              {grades?.map((g) => (
                <SelectItem key={g.id} value={g.id} text={g.name} />
              ))}
            </Select>
            <NumberInput
              id="level-sort"
              label="Sort order"
              min={0}
              value={form.sort_order}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, sort_order: Number(value) || 0 }))
              }
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleCreate}
            disabled={!form.label.trim() || createLevel.isPending}
          >
            {createLevel.isPending ? "Creating…" : "Create"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* Edit modal */}
      <ComposedModal open={!!toEdit} size="md" onClose={() => setToEdit(null)}>
        <ModalHeader title={`Edit ${toEdit?.label ?? ""}`} />
        <ModalBody>
          {updateLevel.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(updateLevel.error, "Failed to update level")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <p
            style={{
              fontSize: "0.875rem",
              color: "#525252",
              marginBottom: "1rem",
            }}
          >
            Renaming a level leaves its selection groups and student choices
            untouched — only the label, grade link, and ordering change.
          </p>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <TextInput
              id="edit-label"
              labelText="Label"
              value={editForm.label}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, label: e.target.value }))
              }
              onBlur={() => setEditLabelTouched(true)}
              invalid={editLabelTouched && !editForm.label.trim()}
              invalidText="A label is required."
            />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <Select
                id="edit-grade"
                labelText="Grade (optional)"
                value={editForm.grade_id}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, grade_id: e.target.value }))
                }
              >
                <SelectItem value="" text="No grade" />
                {grades?.map((g) => (
                  <SelectItem key={g.id} value={g.id} text={g.name} />
                ))}
              </Select>
              <NumberInput
                id="edit-sort"
                label="Sort order"
                min={0}
                value={editForm.sort_order}
                onChange={(_e, { value }) =>
                  setEditForm((f) => ({ ...f, sort_order: Number(value) || 0 }))
                }
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setToEdit(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleEdit}
            disabled={!editForm.label.trim() || updateLevel.isPending}
          >
            {updateLevel.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* Duplicate modal */}
      <ComposedModal
        open={!!toDuplicate}
        size="md"
        onClose={() => setToDuplicate(null)}
      >
        <ModalHeader title={`Duplicate ${toDuplicate?.label ?? ""}`} />
        <ModalBody>
          {duplicateLevel.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(
                duplicateLevel.error,
                "Failed to duplicate level",
              )}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <p
            style={{
              fontSize: "0.875rem",
              color: "#525252",
              marginBottom: "1rem",
            }}
          >
            Every selection group and its subjects are copied to the new level.
            Editing one afterwards does not affect the other.
          </p>
          <div style={{ display: "grid", gap: "1.25rem" }}>
            <TextInput
              id="dup-label"
              labelText="New label"
              helperText="Must differ from every existing level."
              value={dupForm.label}
              onChange={(e) =>
                setDupForm((f) => ({ ...f, label: e.target.value }))
              }
              onBlur={() => setDupLabelTouched(true)}
              invalid={dupLabelTouched && !dupForm.label.trim()}
              invalidText="A label is required."
            />
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <Select
                id="dup-grade"
                labelText="Grade (optional)"
                value={dupForm.grade_id}
                onChange={(e) =>
                  setDupForm((f) => ({ ...f, grade_id: e.target.value }))
                }
              >
                <SelectItem value="" text="No grade" />
                {grades?.map((g) => (
                  <SelectItem key={g.id} value={g.id} text={g.name} />
                ))}
              </Select>
              <NumberInput
                id="dup-sort"
                label="Sort order"
                min={0}
                value={dupForm.sort_order}
                onChange={(_e, { value }) =>
                  setDupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))
                }
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setToDuplicate(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleDuplicate}
            disabled={!dupForm.label.trim() || duplicateLevel.isPending}
          >
            {duplicateLevel.isPending ? "Duplicating…" : "Duplicate"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete level"
        description={
          <>
            Delete <strong>{toDelete?.label}</strong> and all its selection
            groups? This cannot be undone.
          </>
        }
        isPending={deleteLevel.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />

      <ComposedModal open={presetConfirmOpen} size="sm" onClose={() => setPresetConfirmOpen(false)}>
        <ModalHeader title="Load Sri Lanka curriculum preset" />
        <ModalBody>
          <p style={{ fontSize: "0.875rem", color: "#525252", marginBottom: "0.75rem" }}>
            This creates the standard Grade 1–13 curriculum — compulsory
            subjects for primary and junior secondary, O/L baskets, and A/L
            streams — as subjects, levels, and selection groups.
          </p>
          <p style={{ fontSize: "0.875rem", color: "#525252" }}>
            It only fills in what's missing for the grades your school
            actually has — safe to run more than once, and it won't touch
            anything you've already set up by hand.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setPresetConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={() => runPreset.mutate(undefined, { onSuccess: () => setPresetConfirmOpen(false) })}
            disabled={runPreset.isPending}
          >
            {runPreset.isPending ? "Loading…" : "Load Preset"}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
