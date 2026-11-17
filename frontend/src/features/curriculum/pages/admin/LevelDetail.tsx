import { useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router";
import { Alert, Button } from "antd";
import { ArrowLeftOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { useLevelTree, useMediums, useDeleteSelectionGroup, useAddGroupSubject, useRemoveGroupSubject } from "@/features/curriculum/queries/useCurriculum";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import type { CurriculumTreeGroup, GroupSubject } from "@/features/curriculum/api/curriculum";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import GroupsList from "@/features/curriculum/components/GroupsList";
import GroupFormModal from "@/features/curriculum/components/GroupFormModal";
import AddSubjectModal, { type SubjectForm } from "@/features/curriculum/components/AddSubjectModal";
import LevelDetailConfirms from "@/features/curriculum/components/LevelDetailConfirms";
import { useGroupEditor } from "@/features/curriculum/hooks/useGroupEditor";
import { useSubjectDraft } from "@/features/curriculum/hooks/useSubjectDraft";
import { nextSortOrder, stagedSubject } from "@/features/curriculum/lib/subjectDraft";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import InfoTip from "@/shared/ui/InfoTip";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";

const EMPTY_SUBJECT: SubjectForm = { subject_id: "", medium_id: "", prerequisite_note: "", sort_order: 0 };

export default function LevelDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: tree, isLoading, isError, refetch } = useLevelTree(id);
  usePageTitle(tree?.level.label);
  const { data: subjects, isLoading: subjectsLoading, isError: subjectsError, refetch: refetchSubjects } = useSubjects();
  const { data: mediums } = useMediums();

  const deleteGroup = useDeleteSelectionGroup(id);
  const addSubject = useAddGroupSubject(id);
  const removeSubject = useRemoveGroupSubject(id);
  const groups = useGroupEditor(id);
  const draft = useSubjectDraft(tree, addSubject, removeSubject);

  const [subjectModalGroup, setSubjectModalGroup] = useState<CurriculumTreeGroup | null>(null);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT);
  const [toDeleteGroup, setToDeleteGroup] = useState<CurriculumTreeGroup | null>(null);
  const [toRemoveSubject, setToRemoveSubject] = useState<{ group: CurriculumTreeGroup; subject: GroupSubject } | null>(null);
  // Covers refresh/close; useBlocker covers Back, sidebar links and history back/forward.
  useUnsavedChangesGuard(draft.dirty);
  const blocker = useBlocker(draft.dirty);

  // subjects not already in the group being edited
  const taken = new Set(subjectModalGroup ? draft.current(subjectModalGroup).map((s) => s.subject_id) : []);
  const available = subjects && subjectModalGroup ? subjects.filter((s) => !taken.has(s.id)) : [];

  const openAddSubject = (g: CurriculumTreeGroup) => {
    addSubject.reset();
    setSubjectForm({ ...EMPTY_SUBJECT, sort_order: nextSortOrder(g.subjects) });
    setSubjectModalGroup(g);
  };

  const handleAddSubject = () => {
    const subject = subjects?.find((item) => item.id === subjectForm.subject_id);
    if (!subjectModalGroup || !subject) return;
    const medium = mediums?.find((item) => item.id === subjectForm.medium_id);
    if (draft.add(subjectModalGroup, stagedSubject(subject, medium, subjectForm))) setSubjectModalGroup(null);
  };

  const handleRemoveSubject = () => {
    if (!toRemoveSubject) return;
    draft.remove(toRemoveSubject.group, toRemoveSubject.subject.subject_id);
    setToRemoveSubject(null);
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
          <h1 className="os-page__title">{tree.level.label}</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Subject groups and the pick rule for each.
            <InfoTip>To make every subject compulsory, set min and max to the number of subjects in the group.</InfoTip>
          </div>
        </div>
        <div className="os-flex os-gap-2">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate("/curriculum")}>
            Back
          </Button>
          <Button icon={<PlusOutlined />} onClick={groups.openCreate}>
            New group
          </Button>
          <Button type="primary" icon={<SaveOutlined />} disabled={!draft.dirty} loading={draft.saving} onClick={() => void draft.save()}>
            {draft.saving ? "Saving subjects…" : "Save subjects"}
          </Button>
        </div>
      </div>

      {draft.dirty && (
        <Alert type="info" showIcon className="os-mb-4" title="Unsaved subject changes" description="Add or remove subjects from the groups below, then save them together." />
      )}
      {draft.saveError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={draft.clearSaveError}
          className="os-mb-4"
          title="Could not save subjects"
          description="Some changes may not have been saved. Review the groups and try again."
        />
      )}

      <GroupsList
        tree={draft.draftTree!}
        deleteGroup={deleteGroup}
        removeSubject={removeSubject}
        onOpenCreateGroup={groups.openCreate}
        onEditGroup={groups.openEdit}
        onRequestDeleteGroup={setToDeleteGroup}
        onAddSubject={openAddSubject}
        onRequestRemoveSubject={(group, subject) => setToRemoveSubject({ group, subject })}
      />

      <GroupFormModal
        groupModal={groups.mode}
        groupForm={groups.form}
        setGroupForm={groups.setForm}
        createGroup={groups.createGroup}
        updateGroup={groups.updateGroup}
        onClose={groups.close}
        onSave={groups.save}
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

      <LevelDetailConfirms
        toRemoveSubject={toRemoveSubject}
        onCloseRemoveSubject={() => setToRemoveSubject(null)}
        onRemoveSubject={handleRemoveSubject}
        toDeleteGroup={toDeleteGroup}
        deleteGroup={deleteGroup}
        onCloseDeleteGroup={() => setToDeleteGroup(null)}
        blocker={blocker}
      />
    </div>
  );
}
