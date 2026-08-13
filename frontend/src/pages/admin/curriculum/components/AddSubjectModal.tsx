import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router";
import { Select, SelectItem, TextArea, SkeletonText } from "@carbon/react";
import type { useAddGroupSubject, useMediums } from "../../../../queries/useCurriculum";
import type { useSubjects } from "../../../../queries/useSubjects";
import type { CurriculumTreeGroup } from "../../../../services/curriculum";
import FormModal from "../../../../components/common/FormModal";
import ErrorMessage from "../../../../components/common/ErrorMessage";

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
      submitLabel="Add"
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
        <p style={{ fontSize: "0.875rem" }}>
          No subjects in the catalogue yet. <Link to="/subjects/new">Add a subject</Link> first.
        </p>
      ) : available.length === 0 ? (
        <p style={{ fontSize: "0.875rem" }}>Every subject in the catalogue is already in this group.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          <Select
            id="gs-subject"
            labelText="Subject"
            value={subjectForm.subject_id}
            onChange={(e) => setSubjectForm((f) => ({ ...f, subject_id: e.target.value }))}
          >
            <SelectItem value="" text="Choose a subject" />
            {available.map((s) => (
              <SelectItem key={s.id} value={s.id} text={`${s.name} (${s.code})`} />
            ))}
          </Select>
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
