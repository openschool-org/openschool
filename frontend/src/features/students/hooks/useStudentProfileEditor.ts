import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useUpdateStudent, useDeleteStudent } from "@/features/students/queries/useStudents";
import type { StudentWithClass } from "@/features/students/api/student";
import type { StudentProfileForm } from "@/features/students/components/StudentProfileTab";
import { getErrorMessage } from "@/shared/api/errors";

const studentToForm = (s: StudentWithClass): StudentProfileForm => ({
  full_name: s.full_name,
  name_with_initials: s.name_with_initials ?? "",
  calling_name: s.calling_name ?? "",
  phone_number: s.phone ?? "",
  address: s.address ?? "",
  whatsapp: s.whatsapp ?? "",
  special_remarks: s.special_remarks ?? "",
  gender: (s.gender ?? "") as StudentProfileForm["gender"],
});

const EMPTY: StudentProfileForm = { full_name: "", name_with_initials: "", calling_name: "", phone_number: "", address: "", whatsapp: "", special_remarks: "", gender: "" };

// Edit mode, form state and the save / delete mutations for the student profile banner and tab.
export function useStudentProfileEditor(id: string, student: StudentWithClass | undefined, startEditing: boolean) {
  const navigate = useNavigate();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const [editing, setEditing] = useState(startEditing);
  const [form, setForm] = useState<StudentProfileForm>(EMPTY);
  const loadedFor = useRef<string | null>(null);
  const editedFields = useRef<Set<keyof StudentProfileForm>>(new Set());

  useEffect(() => {
    if (!student) return;
    const next = studentToForm(student);
    if (loadedFor.current !== student.id) {
      setForm(next);
      editedFields.current.clear();
      loadedFor.current = student.id;
      return;
    }
    // Refresh server-owned fields without overwriting anything the user has
    // changed locally while the profile query was being refreshed.
    setForm((current) => {
      const merged = { ...current };
      (Object.keys(next) as (keyof StudentProfileForm)[]).forEach((field) => {
        if (!editedFields.current.has(field)) Object.assign(merged, { [field]: next[field] });
      });
      return merged;
    });
  }, [student]);

  const trimOrUndefined = (v: string) => v.trim() || undefined;
  const hasUnsaved = editing && !!student && JSON.stringify(form) !== JSON.stringify(studentToForm(student));

  return {
    editing,
    hasUnsaved,
    startEdit: () => setEditing(true),
    cancel: () => {
      if (student) setForm(studentToForm(student));
      editedFields.current.clear();
      updateStudent.reset();
      setEditing(false);
    },
    form,
    change: (field: keyof StudentProfileForm, value: string) => {
      editedFields.current.add(field);
      setForm((f) => ({ ...f, [field]: value }));
    },
    isValid: !!form.full_name.trim(),
    updateStudent,
    updateError: updateStudent.isError ? getErrorMessage(updateStudent.error, "Failed to update student") : null,
    save: (onDone: () => void) =>
      updateStudent.mutate(
        {
          id,
          data: {
            full_name: form.full_name.trim(),
            name_with_initials: form.name_with_initials.trim(),
            calling_name: form.calling_name.trim(),
            phone_number: trimOrUndefined(form.phone_number),
            address: trimOrUndefined(form.address),
            whatsapp: trimOrUndefined(form.whatsapp),
            special_remarks: trimOrUndefined(form.special_remarks),
            gender: form.gender || undefined,
          },
        },
        { onSuccess: () => { editedFields.current.clear(); setEditing(false); onDone(); } },
      ),
    deleteStudent,
    remove: () => deleteStudent.mutate(id),
    goToStudents: () => navigate("/students"),
  };
}
