import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useUpdateStudent, useDeleteStudent } from "@/features/students/queries/useStudents";
import type { StudentWithClass } from "@/features/students/api/student";
import type { StudentProfileForm } from "@/features/students/components/StudentProfileTab";
import { splitFullName } from "@/shared/lib/name";
import { getErrorMessage } from "@/shared/api/errors";

const studentToForm = (s: StudentWithClass): StudentProfileForm => ({
  ...splitFullName(s.full_name),
  phone_number: s.phone ?? "",
  address: s.address ?? "",
  whatsapp: s.whatsapp ?? "",
  special_remarks: s.special_remarks ?? "",
  gender: (s.gender ?? "") as StudentProfileForm["gender"],
});

const EMPTY: StudentProfileForm = { given_name: "", family_name: "", phone_number: "", address: "", whatsapp: "", special_remarks: "", gender: "" };

// Edit mode, form state and the save / delete mutations for the student profile banner and tab.
export function useStudentProfileEditor(id: string, student: StudentWithClass | undefined, startEditing: boolean) {
  const navigate = useNavigate();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const [editing, setEditing] = useState(startEditing);
  const [form, setForm] = useState<StudentProfileForm>(EMPTY);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (student && loadedFor.current !== student.id) {
      setForm(studentToForm(student));
      loadedFor.current = student.id;
    }
  }, [student]);

  const trimOrUndefined = (v: string) => v.trim() || undefined;
  const hasUnsaved = editing && !!student && JSON.stringify(form) !== JSON.stringify(studentToForm(student));

  return {
    editing,
    hasUnsaved,
    startEdit: () => setEditing(true),
    cancel: () => {
      if (student) setForm(studentToForm(student));
      updateStudent.reset();
      setEditing(false);
    },
    form,
    change: (field: keyof StudentProfileForm, value: string) => setForm((f) => ({ ...f, [field]: value })),
    isValid: !!form.given_name.trim() && !!form.family_name.trim(),
    updateStudent,
    updateError: updateStudent.isError ? getErrorMessage(updateStudent.error, "Failed to update student") : null,
    save: (onDone: () => void) =>
      updateStudent.mutate(
        {
          id,
          data: {
            given_name: form.given_name.trim(),
            family_name: form.family_name.trim(),
            phone_number: trimOrUndefined(form.phone_number),
            address: trimOrUndefined(form.address),
            whatsapp: trimOrUndefined(form.whatsapp),
            special_remarks: trimOrUndefined(form.special_remarks),
            gender: form.gender || undefined,
          },
        },
        { onSuccess: () => { setEditing(false); onDone(); } },
      ),
    deleteStudent,
    remove: () => deleteStudent.mutate(id),
    goToStudents: () => navigate("/students"),
  };
}
