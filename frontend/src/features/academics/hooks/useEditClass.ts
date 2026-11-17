import { useState } from "react";
import type { ClassWithDetails } from "@/features/academics/api/class";
import { useUpdateClass } from "@/features/academics/queries/useClasses";

// The edit-class modal on the Grades & Classes page: name, medium and homeroom.
export function useEditClass() {
  const [editing, setEditing] = useState<ClassWithDetails | null>(null);
  const [name, setName] = useState("");
  const [medium, setMedium] = useState("");
  const [homeClassroom, setHomeClassroom] = useState("");
  const updateClass = useUpdateClass(editing?.id ?? "");

  const open = (cls: ClassWithDetails) => {
    updateClass.reset();
    setEditing(cls);
    setName(cls.name);
    setMedium(cls.medium_id ?? "");
    setHomeClassroom(cls.home_classroom_id ?? "");
  };
  const close = () => setEditing(null);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed || !editing) return;
    updateClass.mutate(
      { name: trimmed, form_teacher_id: editing.form_teacher_id, medium_id: medium || null, home_classroom_id: homeClassroom || null },
      { onSuccess: close },
    );
  };

  return { editing, name, setName, medium, setMedium, homeClassroom, setHomeClassroom, updateClass, open, close, save };
}
