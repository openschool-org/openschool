import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router";
import { Select, SelectItem, TextArea, SkeletonText } from "@carbon/react";
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
      submitLabel="Save subject"
      pendingLabel="Saving subject…"
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
          <Select
            id="gs-medium"
            labelText="Medium restriction (optional)"
            helperText="Leave as any medium unless this subject is only offered in one."
            value={subjectForm.medium_id}
            onChange={(e) => setSubjectForm((f) => ({ ...f, medium_id: e.target.value }))}
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
            onChange={(e) => setSubjectForm((f) => ({ ...f, prerequisite_note: e.target.value }))}
          />
        </div>
      )}
    </FormModal>
  );
}
