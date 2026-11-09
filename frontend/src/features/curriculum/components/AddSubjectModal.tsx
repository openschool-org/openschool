import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router";
import { SkeletonText } from "@/shared/ui/Skeleton";
import SelectField from "@/shared/ui/SelectField";
import TextAreaField from "@/shared/ui/TextAreaField";
import type { useAddGroupSubject, useMediums } from "@/features/curriculum/queries/useCurriculum";
import type { useSubjects } from "@/features/curriculum/queries/useSubjects";
import type { CurriculumTreeGroup } from "@/features/curriculum/api/curriculum";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import ErrorMessage from "@/shared/ui/ErrorMessage";

export interface SubjectForm {
  subject_id: string;
  medium_id: string;
  prerequisite_note: string;
  sort_order: number;
}

interface Props {
  subjectModalGroup: CurriculumTreeGroup | null;
  subjects: ReturnType<typeof useSubjects>["data"];
  subjectsLoading: boolean;
  subjectsError: boolean;
  onRetrySubjects: () => void;
  available: NonNullable<ReturnType<typeof useSubjects>["data"]>;
  mediums: ReturnType<typeof useMediums>["data"];
  subjectForm: SubjectForm;
  setSubjectForm: Dispatch<SetStateAction<SubjectForm>>;
  addSubject: ReturnType<typeof useAddGroupSubject>;
  onClose: () => void;
  onAdd: () => void;
}

export default function AddSubjectModal({
  subjectModalGroup,
  subjects,
  subjectsLoading,
  subjectsError,
  onRetrySubjects,
  available,
  mediums,
  subjectForm,
  setSubjectForm,
  addSubject,
  onClose,
  onAdd,
}: Props) {
  return (
    <FormModal
      open={!!subjectModalGroup}
      title={`Add subject to ${subjectModalGroup?.label ?? ""}`}
      onClose={onClose}
      onSubmit={onAdd}
      isPending={addSubject.isPending}
      submitDisabled={!subjectForm.subject_id}
      submitLabel="Add to group"
      pendingLabel="Adding…"
      isError={addSubject.isError}
      error={addSubject.error}
      errorFallback="Failed to add subject"
    >
      {subjectsLoading ? (
        <SkeletonText width="70%" />
      ) : subjectsError ? (
        <ErrorMessage message="Could not load the subject catalogue." onRetry={onRetrySubjects} />
      ) : subjects && subjects.length === 0 ? (
        <p className="os-text-md">
          No subjects in the catalogue yet. <Link to="/subjects/new">Add a subject</Link> first.
        </p>
      ) : available.length === 0 ? (
        <p className="os-text-md">Every subject in the catalogue is already in this group.</p>
      ) : (
        <div className="os-grid os-gap-4">
          <EntityCombobox
            id="gs-subject"
            labelText="Subject"
            items={available}
            selectedId={subjectForm.subject_id}
            onSelect={(id) => setSubjectForm((f) => ({ ...f, subject_id: id }))}
            getId={(s) => s.id}
            itemToString={(s) => `${s.name} (${s.code})`}
            placeholder="Search subjects by name or code…"
          />
          <SelectField
            id="gs-medium"
            label="Medium restriction (optional)"
            helperText="Leave as any medium unless this subject is only offered in one."
            value={subjectForm.medium_id}
            onChange={(v) => setSubjectForm((f) => ({ ...f, medium_id: v }))}
            options={[{ value: "", label: "Any medium" }, ...(mediums ?? []).map((m) => ({ value: m.id, label: m.name }))]}
          />
          <TextAreaField
            id="gs-note"
            label="Prerequisite note (optional)"
            helperText="Guidance shown to admins and students. Not enforced."
            rows={2}
            value={subjectForm.prerequisite_note}
            onChange={(v) => setSubjectForm((f) => ({ ...f, prerequisite_note: v }))}
          />
        </div>
      )}
    </FormModal>
  );
}
