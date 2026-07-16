import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Add, ArrowLeft, Book, TrashCan, Warning } from "@carbon/icons-react";
import {
  Button,
  Tag,
  TextInput,
  TextArea,
  NumberInput,
  Select,
  SelectItem,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { AxiosError } from "axios";
import {
  useLevelTree,
  useMediums,
  useCreateSelectionGroup,
  useUpdateSelectionGroup,
  useDeleteSelectionGroup,
  useAddGroupSubject,
  useRemoveGroupSubject,
} from "../../../queries/useCurriculum";
import { useSubjects } from "../../../queries/useSubjects";
import type {
  CurriculumTreeGroup,
  GroupSubject,
} from "../../../services/curriculum";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";

function apiError(e: unknown, fallback: string) {
  return (e as AxiosError<{ error: string }>)?.response?.data?.error ?? fallback;
}

// Owns its own hover state so the page does not have to track a hovered id.
function SubjectCard({
  subject,
  onRemove,
}: {
  subject: GroupSubject;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const extras = subject.medium_name || subject.prerequisite_note;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "0.75rem",
        border: `1px solid ${hover ? "#406AAF" : "#e0e0e0"}`,
        borderRadius: "4px",
        background: hover ? "#f7f9fd" : "#fff",
        transition: "border-color 70ms ease, background-color 70ms ease",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Book size={16} style={{ fill: "#406AAF", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#161616",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={subject.subject_name}
          >
            {subject.subject_name}
          </div>
          <div
            style={{
              fontSize: "0.6875rem",
              fontFamily: "IBM Plex Mono, monospace",
              color: "#8d8d8d",
            }}
          >
            {subject.subject_code}
          </div>
        </div>
        <Button
          hasIconOnly
          kind="ghost"
          size="sm"
          iconDescription="Remove"
          renderIcon={TrashCan}
          onClick={onRemove}
        />
      </div>

      {extras && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {subject.medium_name && (
            <div>
              <Tag type="purple" size="sm" style={{ margin: 0 }}>
                {subject.medium_name} only
              </Tag>
            </div>
          )}
          {subject.prerequisite_note && (
            <p
              style={{
                margin: 0,
                fontSize: "0.6875rem",
                color: "#525252",
                display: "flex",
                gap: "0.25rem",
              }}
            >
              <Warning
                size={12}
                style={{ fill: "#8d8d8d", flexShrink: 0, marginTop: "1px" }}
              />
              {subject.prerequisite_note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Describes a group's pick rule in plain words. An all-mandatory pool is just
// min = max = pool size, so it needs no special flag anywhere.
function ruleLabel(min: number, max: number, pool: number) {
  if (pool > 0 && min === pool && max === pool) {
    return `all ${pool} mandatory`;
  }
  if (min === max) {
    return `pick ${min} of ${pool}`;
  }
  return `pick ${min}–${max} of ${pool}`;
}

// A group asking for more subjects than it offers can never be satisfied. The
// backend does not reject this (the pool changes independently of the rule), so
// surface it here while the admin is still editing.
function unsatisfiable(min: number, pool: number) {
  return min > pool;
}

const EMPTY_GROUP = { label: "", min_select: 1, max_select: 1, sort_order: 0 };
const EMPTY_SUBJECT = {
  subject_id: "",
  medium_id: "",
  prerequisite_note: "",
  sort_order: 0,
};

export default function LevelDetail() {
  const { id = "" } = useParams();

  const { data: tree, isLoading, isError, refetch } = useLevelTree(id);
  const { data: subjects } = useSubjects();
  const { data: mediums } = useMediums();

  const createGroup = useCreateSelectionGroup(id);
  const updateGroup = useUpdateSelectionGroup(id);
  const deleteGroup = useDeleteSelectionGroup(id);
  const addSubject = useAddGroupSubject(id);
  const removeSubject = useRemoveGroupSubject(id);

  const [groupModal, setGroupModal] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] = useState<CurriculumTreeGroup | null>(
    null,
  );
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);

  const [subjectModalGroup, setSubjectModalGroup] =
    useState<CurriculumTreeGroup | null>(null);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT);

  const [toDeleteGroup, setToDeleteGroup] =
    useState<CurriculumTreeGroup | null>(null);
  const [toRemoveSubject, setToRemoveSubject] = useState<{
    group: CurriculumTreeGroup;
    subject: GroupSubject;
  } | null>(null);

  // subjects not already in the group being edited
  const available = useMemo(() => {
    if (!subjects || !subjectModalGroup) return [];
    const taken = new Set(subjectModalGroup.subjects.map((s) => s.subject_id));
    return subjects.filter((s) => !taken.has(s.id));
  }, [subjects, subjectModalGroup]);

  const openCreateGroup = () => {
    createGroup.reset();
    setGroupForm(EMPTY_GROUP);
    setEditingGroup(null);
    setGroupModal("create");
  };

  const openEditGroup = (g: CurriculumTreeGroup) => {
    updateGroup.reset();
    setGroupForm({
      label: g.label,
      min_select: g.min_select,
      max_select: g.max_select,
      sort_order: g.sort_order,
    });
    setEditingGroup(g);
    setGroupModal("edit");
  };

  const handleSaveGroup = () => {
    const data = {
      label: groupForm.label.trim(),
      min_select: groupForm.min_select,
      max_select: groupForm.max_select,
      sort_order: groupForm.sort_order,
    };

    if (groupModal === "create") {
      createGroup.mutate(data, { onSuccess: () => setGroupModal(null) });
    } else if (editingGroup) {
      updateGroup.mutate(
        { groupId: editingGroup.id, data },
        { onSuccess: () => setGroupModal(null) },
      );
    }
  };

  const openAddSubject = (g: CurriculumTreeGroup) => {
    addSubject.reset();
    setSubjectForm({ ...EMPTY_SUBJECT, sort_order: g.subjects.length });
    setSubjectModalGroup(g);
  };

  const handleAddSubject = () => {
    if (!subjectModalGroup) return;
    addSubject.mutate(
      {
        groupId: subjectModalGroup.id,
        data: {
          subject_id: subjectForm.subject_id,
          medium_id: subjectForm.medium_id || undefined,
          prerequisite_note: subjectForm.prerequisite_note.trim() || undefined,
          sort_order: subjectForm.sort_order,
        },
      },
      { onSuccess: () => setSubjectModalGroup(null) },
    );
  };

  const handleRemoveSubject = () => {
    if (!toRemoveSubject) return;
    removeSubject.mutate(
      {
        groupId: toRemoveSubject.group.id,
        subjectId: toRemoveSubject.subject.subject_id,
      },
      { onSettled: () => setToRemoveSubject(null) },
    );
  };

  const handleDeleteGroup = () => {
    if (!toDeleteGroup) return;
    deleteGroup.mutate(toDeleteGroup.id, {
      onSettled: () => setToDeleteGroup(null),
    });
  };

  const groupFormValid =
    groupForm.label.trim() && groupForm.max_select >= groupForm.min_select;

  if (isLoading) return <LoadingSpinner />;
  if (isError || !tree) {
    return (
      <div className="os-page">
        <ErrorMessage message="Could not load this level." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <div className="os-page__breadcrumb">
            <Link to="/curriculum">Curriculum</Link>
            <span>/</span>
            <span>{tree.level.label}</span>
          </div>
          <h1 className="os-page__title">{tree.level.label}</h1>
          <p className="os-page__subtitle">
            Each group is a pool of subjects with a pick rule. Make every subject
            compulsory by setting min and max to the number of subjects in the
            pool.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            renderIcon={ArrowLeft}
            kind="ghost"
            size="md"
            as={Link}
            to="/curriculum"
          >
            Back
          </Button>
          <Button
            renderIcon={Add}
            kind="primary"
            size="md"
            onClick={openCreateGroup}
          >
            New Group
          </Button>
        </div>
      </div>

      {deleteGroup.isError && (
        <InlineNotification
          kind="error"
          title="Could not delete group"
          subtitle={apiError(
            deleteGroup.error,
            "The group may have students enrolled through it.",
          )}
          lowContrast
          onClose={() => deleteGroup.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {removeSubject.isError && (
        <InlineNotification
          kind="error"
          title="Could not remove subject"
          subtitle={apiError(removeSubject.error, "Please try again.")}
          lowContrast
          onClose={() => removeSubject.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      {tree.groups.length === 0 ? (
        <div className="os-section">
          <EmptyState
            title="No selection groups"
            description="Add a group for each decision a student makes at this level — one for compulsory subjects, and one per elective pool."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreateGroup}>
                New Group
              </Button>
            }
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {tree.groups.map((g) => {
            const pool = g.subjects.length;
            const broken = unsatisfiable(g.min_select, pool);

            return (
              <div
                key={g.id}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "#f4f4f4",
                    borderBottom: "1px solid #e0e0e0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      color: "#161616",
                    }}
                  >
                    {g.label}
                  </span>
                  <Tag type={broken ? "red" : "blue"} size="sm">
                    {ruleLabel(g.min_select, g.max_select, pool)}
                  </Tag>
                  <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem" }}>
                    <Button kind="ghost" size="sm" onClick={() => openEditGroup(g)}>
                      Edit
                    </Button>
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      onClick={() => setToDeleteGroup(g)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {broken && (
                  <InlineNotification
                    kind="warning"
                    title="Impossible rule"
                    subtitle={`This group asks for ${g.min_select} subject(s) but only offers ${pool}. No student can satisfy it.`}
                    lowContrast
                    hideCloseButton
                    style={{ maxWidth: "100%", margin: 0 }}
                  />
                )}

                <div style={{ padding: "0.75rem" }}>
                  {pool === 0 ? (
                    <p
                      style={{
                        margin: 0,
                        padding: "0.75rem",
                        fontSize: "0.8125rem",
                        color: "#8d8d8d",
                      }}
                    >
                      No subjects in this group yet.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: "0.5rem",
                        // let each card hug its own content: stretching makes
                        // cards without a tag look bottom-padded
                        alignItems: "start",
                      }}
                    >
                      {g.subjects.map((s) => (
                        <SubjectCard
                          key={s.subject_id}
                          subject={s}
                          onRemove={() =>
                            setToRemoveSubject({ group: g, subject: s })
                          }
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Add}
                    onClick={() => openAddSubject(g)}
                    style={{ marginTop: "0.5rem" }}
                  >
                    Add subject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Group create/edit modal */}
      <ComposedModal
        open={!!groupModal}
        size="sm"
        onClose={() => setGroupModal(null)}
      >
        <ModalHeader
          title={groupModal === "create" ? "New selection group" : "Edit group"}
        />
        <ModalBody>
          {(createGroup.isError || updateGroup.isError) && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(
                createGroup.error ?? updateGroup.error,
                "Failed to save group",
              )}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <TextInput
              id="group-label"
              labelText="Label"
              placeholder="e.g. Compulsory, or Basket 1"
              value={groupForm.label}
              onChange={(e) =>
                setGroupForm((f) => ({ ...f, label: e.target.value }))
              }
            />
            <NumberInput
              id="group-min"
              label="Minimum subjects"
              min={0}
              value={groupForm.min_select}
              onChange={(_e, { value }) =>
                setGroupForm((f) => ({ ...f, min_select: Number(value) || 0 }))
              }
            />
            <NumberInput
              id="group-max"
              label="Maximum subjects"
              min={0}
              invalid={groupForm.max_select < groupForm.min_select}
              invalidText="Maximum must be greater than or equal to minimum."
              value={groupForm.max_select}
              onChange={(_e, { value }) =>
                setGroupForm((f) => ({ ...f, max_select: Number(value) || 0 }))
              }
            />
            <NumberInput
              id="group-sort"
              label="Sort order"
              min={0}
              value={groupForm.sort_order}
              onChange={(_e, { value }) =>
                setGroupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))
              }
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setGroupModal(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleSaveGroup}
            disabled={
              !groupFormValid || createGroup.isPending || updateGroup.isPending
            }
          >
            {createGroup.isPending || updateGroup.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* Add subject modal */}
      <ComposedModal
        open={!!subjectModalGroup}
        size="sm"
        onClose={() => setSubjectModalGroup(null)}
      >
        <ModalHeader title={`Add subject to ${subjectModalGroup?.label ?? ""}`} />
        <ModalBody>
          {addSubject.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={apiError(addSubject.error, "Failed to add subject")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}

          {subjects && subjects.length === 0 ? (
            <p style={{ fontSize: "0.875rem" }}>
              No subjects in the catalogue yet.{" "}
              <Link to="/subjects/new">Add a subject</Link> first.
            </p>
          ) : available.length === 0 ? (
            <p style={{ fontSize: "0.875rem" }}>
              Every subject in the catalogue is already in this group.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              <Select
                id="gs-subject"
                labelText="Subject"
                value={subjectForm.subject_id}
                onChange={(e) =>
                  setSubjectForm((f) => ({ ...f, subject_id: e.target.value }))
                }
              >
                <SelectItem value="" text="Choose a subject" />
                {available.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    text={`${s.name} (${s.code})`}
                  />
                ))}
              </Select>
              <Select
                id="gs-medium"
                labelText="Medium restriction (optional)"
                helperText="Leave as any medium unless this subject is only offered in one."
                value={subjectForm.medium_id}
                onChange={(e) =>
                  setSubjectForm((f) => ({ ...f, medium_id: e.target.value }))
                }
              >
                <SelectItem value="" text="Any medium" />
                {mediums?.map((m) => (
                  <SelectItem key={m.id} value={m.id} text={m.name} />
                ))}
              </Select>
              <TextArea
                id="gs-note"
                labelText="Prerequisite note (optional)"
                helperText="Guidance shown to admins and students. Not enforced."
                rows={2}
                value={subjectForm.prerequisite_note}
                onChange={(e) =>
                  setSubjectForm((f) => ({
                    ...f,
                    prerequisite_note: e.target.value,
                  }))
                }
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setSubjectModalGroup(null)}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleAddSubject}
            disabled={!subjectForm.subject_id || addSubject.isPending}
          >
            {addSubject.isPending ? "Adding…" : "Add"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toRemoveSubject}
        title="Remove subject from group"
        description={
          <>
            Remove <strong>{toRemoveSubject?.subject.subject_name}</strong> from{" "}
            <strong>{toRemoveSubject?.group.label}</strong>? The subject stays in
            the catalogue.
          </>
        }
        isPending={removeSubject.isPending}
        onClose={() => setToRemoveSubject(null)}
        onConfirm={handleRemoveSubject}
      />

      <ConfirmDeleteModal
        open={!!toDeleteGroup}
        title="Delete selection group"
        description={
          <>
            Delete <strong>{toDeleteGroup?.label}</strong>? Its subjects stay in
            the catalogue.
          </>
        }
        isPending={deleteGroup.isPending}
        onClose={() => setToDeleteGroup(null)}
        onConfirm={handleDeleteGroup}
      />
    </div>
  );
}
