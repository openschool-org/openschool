import { useState } from "react";
import type { CurriculumTreeGroup } from "@/features/curriculum/api/curriculum";
import { useCreateSelectionGroup, useUpdateSelectionGroup } from "@/features/curriculum/queries/useCurriculum";
import type { GroupForm } from "@/features/curriculum/components/GroupFormModal";

const EMPTY_GROUP: GroupForm = { label: "", min_select: 1, max_select: 1, sort_order: 0 };

// The create/edit selection group modal for one level.
export function useGroupEditor(levelId: string) {
  const createGroup = useCreateSelectionGroup(levelId);
  const updateGroup = useUpdateSelectionGroup(levelId);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<CurriculumTreeGroup | null>(null);
  const [form, setForm] = useState(EMPTY_GROUP);

  const openCreate = () => {
    createGroup.reset();
    setForm(EMPTY_GROUP);
    setEditing(null);
    setMode("create");
  };

  const openEdit = (g: CurriculumTreeGroup) => {
    updateGroup.reset();
    setForm({ label: g.label, min_select: g.min_select, max_select: g.max_select, sort_order: g.sort_order });
    setEditing(g);
    setMode("edit");
  };

  const close = () => setMode(null);

  const save = () => {
    const data = { label: form.label.trim(), min_select: form.min_select, max_select: form.max_select, sort_order: form.sort_order };
    if (mode === "create") createGroup.mutate(data, { onSuccess: close });
    else if (editing) updateGroup.mutate({ groupId: editing.id, data }, { onSuccess: close });
  };

  return { mode, form, setForm, createGroup, updateGroup, openCreate, openEdit, close, save };
}
