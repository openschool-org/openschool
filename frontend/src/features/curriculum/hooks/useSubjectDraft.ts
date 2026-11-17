import { useMemo, useState } from "react";
import type { CurriculumTree, CurriculumTreeGroup, GroupSubject } from "@/features/curriculum/api/curriculum";
import type { useAddGroupSubject, useRemoveGroupSubject } from "@/features/curriculum/queries/useCurriculum";
import { subjectDiff } from "@/features/curriculum/lib/subjectDraft";

type AddMutation = ReturnType<typeof useAddGroupSubject>;
type RemoveMutation = ReturnType<typeof useRemoveGroupSubject>;

// Subject additions and removals staged per group, saved together with one button.
export function useSubjectDraft(tree: CurriculumTree | undefined, addSubject: AddMutation, removeSubject: RemoveMutation) {
  const [changes, setChanges] = useState<Record<string, GroupSubject[]>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const draftTree = useMemo(
    () => (tree ? { ...tree, groups: tree.groups.map((group) => ({ ...group, subjects: changes[group.id] ?? group.subjects })) } : null),
    [tree, changes],
  );

  const current = (group: CurriculumTreeGroup) => changes[group.id] ?? group.subjects;

  const stage = (group: CurriculumTreeGroup, subjects: GroupSubject[]) => {
    setChanges((draft) => ({ ...draft, [group.id]: subjects }));
    setDirty(true);
    setSaveError(false);
  };

  // Returns false when the subject is already in the group.
  const add = (group: CurriculumTreeGroup, subject: GroupSubject) => {
    const subjects = current(group);
    if (subjects.some((item) => item.subject_id === subject.subject_id)) return false;
    stage(group, [...subjects, subject]);
    return true;
  };

  const remove = (group: CurriculumTreeGroup, subjectId: string) =>
    stage(group, current(group).filter((item) => item.subject_id !== subjectId));

  const saveGroup = async (group: CurriculumTreeGroup) => {
    const diff = subjectDiff(group.subjects, current(group));
    for (const subject of diff.remove) {
      await removeSubject.mutateAsync({ groupId: group.id, subjectId: subject.subject_id });
    }
    for (const subject of diff.add) {
      await addSubject.mutateAsync({
        groupId: group.id,
        data: {
          subject_id: subject.subject_id,
          medium_id: subject.medium_id ?? undefined,
          prerequisite_note: subject.prerequisite_note ?? undefined,
          sort_order: subject.sort_order,
        },
      });
    }
  };

  const save = async () => {
    if (!tree) return;
    setSaving(true);
    setSaveError(false);
    try {
      for (const group of tree.groups) await saveGroup(group);
      setDirty(false);
      setChanges({});
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return { draftTree, current, add, remove, save, dirty, saving, saveError, clearSaveError: () => setSaveError(false) };
}
