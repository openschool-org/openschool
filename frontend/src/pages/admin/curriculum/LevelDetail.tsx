import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Add, ArrowLeft } from "@carbon/icons-react";
import { Button } from "@carbon/react";
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
import type { CurriculumTreeGroup, GroupSubject } from "../../../services/curriculum";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import GroupsList from "./components/GroupsList";
import GroupFormModal, { type GroupForm } from "./components/GroupFormModal";
import AddSubjectModal, { type SubjectForm } from "./components/AddSubjectModal";

const EMPTY_GROUP: GroupForm = { label: "", min_select: 1, max_select: 1, sort_order: 0 };
const EMPTY_SUBJECT: SubjectForm = {
  subject_id: "",
  medium_id: "",
  prerequisite_note: "",
  sort_order: 0,
};

export default function LevelDetail() {
  const { id = "" } = useParams();

  const { data: tree, isLoading, isError, refetch } = useLevelTree(id);
  const { data: subjects, isLoading: subjectsLoading, isError: subjectsError, refetch: refetchSubjects } = useSubjects();
  const { data: mediums } = useMediums();

  const createGroup = useCreateSelectionGroup(id);
  const updateGroup = useUpdateSelectionGroup(id);
  const deleteGroup = useDeleteSelectionGroup(id);
  const addSubject = useAddGroupSubject(id);
  const removeSubject = useRemoveGroupSubject(id);

  const [groupModal, setGroupModal] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] = useState<CurriculumTreeGroup | null>(null);
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);

  const [subjectModalGroup, setSubjectModalGroup] = useState<CurriculumTreeGroup | null>(null);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT);

  const [toDeleteGroup, setToDeleteGroup] = useState<CurriculumTreeGroup | null>(null);
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
      updateGroup.mutate({ groupId: editingGroup.id, data }, { onSuccess: () => setGroupModal(null) });
    }
  };

  const openAddSubject = (g: CurriculumTreeGroup) => {
    addSubject.reset();
    // Max existing + 1, not length — a gap from a deleted subject would
    // otherwise hand out a colliding sort_order.
    const nextSortOrder = g.subjects.reduce((max, s) => Math.max(max, s.sort_order), -1) + 1;
    setSubjectForm({ ...EMPTY_SUBJECT, sort_order: nextSortOrder });
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
          <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/curriculum">
            Back
          </Button>
          <Button renderIcon={Add} kind="primary" size="md" onClick={openCreateGroup}>
            New Group
          </Button>
        </div>
      </div>

      <GroupsList
        tree={tree}
        deleteGroup={deleteGroup}
        removeSubject={removeSubject}
        onOpenCreateGroup={openCreateGroup}
        onEditGroup={openEditGroup}
        onRequestDeleteGroup={setToDeleteGroup}
        onAddSubject={openAddSubject}
        onRequestRemoveSubject={(group, subject) => setToRemoveSubject({ group, subject })}
      />

      <GroupFormModal
        groupModal={groupModal}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        createGroup={createGroup}
        updateGroup={updateGroup}
        onClose={() => setGroupModal(null)}
        onSave={handleSaveGroup}
      />

      <AddSubjectModal
        subjectModalGroup={subjectModalGroup}
        subjects={subjects}
        subjectsLoading={subjectsLoading}
        subjectsError={subjectsError}
        onRetrySubjects={refetchSubjects}
        available={available}
        mediums={mediums}
        subjectForm={subjectForm}
        setSubjectForm={setSubjectForm}
        addSubject={addSubject}
        onClose={() => setSubjectModalGroup(null)}
        onAdd={handleAddSubject}
      />

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
