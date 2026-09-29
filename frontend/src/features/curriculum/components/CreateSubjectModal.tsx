import { useState } from "react";
import { NumberInput, TextInput } from "@carbon/react";
import type { Subject } from "@/features/curriculum/api/subject";
import { useCreateSubject } from "@/features/curriculum/queries/useSubjects";
import FormModal from "@/shared/ui/FormModal";

interface Props {
  open: boolean;
  subjects: Subject[];
  onClose: () => void;
}

export default function CreateSubjectModal({ open, subjects, onClose }: Props) {
  const createSubject = useCreateSubject();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [touched, setTouched] = useState({ name: false, code: false });

  const duplicateName = subjects.some((subject) => subject.name.trim().toLowerCase() === name.trim().toLowerCase());
  const duplicateCode = subjects.some((subject) => subject.code.trim().toLowerCase() === code.trim().toLowerCase());
  const nameInvalid = touched.name && !name.trim();
  const codeInvalid = touched.code && !code.trim();
  const isValid = !!name.trim() && !!code.trim() && !duplicateName && !duplicateCode && maxMarks > 0;

  const reset = () => {
    setName("");
    setCode("");
    setType("");
    setMaxMarks(100);
    setTouched({ name: false, code: false });
    createSubject.reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = () => {
    setTouched({ name: true, code: true });
    if (!isValid) return;
    createSubject.mutate(
      { name: name.trim(), code: code.trim(), type: type.trim(), max_marks: maxMarks },
      { onSuccess: close },
    );
  };

  return (
    <FormModal
      open={open}
      title="Add subject"
      onClose={close}
      onSubmit={save}
      isPending={createSubject.isPending}
      submitDisabled={!isValid}
      submitLabel="Save subject"
      pendingLabel="Saving subject…"
      isError={createSubject.isError}
      error={createSubject.error}
      errorTitle="Could not save subject"
      errorFallback="Check the subject name and code, then try again."
    >
      <div className="os-grid os-gap-4">
        <TextInput
          id="create-subject-name"
          labelText="Subject name"
          placeholder="e.g. Mathematics"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouched((value) => ({ ...value, name: true }))}
          invalid={nameInvalid || duplicateName}
          invalidText={duplicateName ? "A subject with this name already exists." : "Subject name is required."}
        />
        <TextInput
          id="create-subject-code"
          labelText="Subject code"
          placeholder="e.g. MATH-01"
          helperText="Must be unique across the subject catalogue."
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onBlur={() => setTouched((value) => ({ ...value, code: true }))}
          invalid={codeInvalid || duplicateCode}
          invalidText={duplicateCode ? "This subject code is already in use." : "Subject code is required."}
        />
        <TextInput
          id="create-subject-type"
          labelText="Type (optional)"
          placeholder="e.g. core, language, aesthetic"
          value={type}
          onChange={(event) => setType(event.target.value)}
        />
        <NumberInput
          id="create-subject-max-marks"
          label="Max marks"
          min={1}
          max={1000}
          value={maxMarks}
          onChange={(_event, { value }) => setMaxMarks(Number(value ?? 100))}
          helperText="The maximum marks a student can receive for this subject."
        />
      </div>
    </FormModal>
  );
}
