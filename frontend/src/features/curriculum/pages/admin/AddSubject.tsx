import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, TextInput, NumberInput, InlineNotification } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useCreateSubject } from "@/features/curriculum/queries/useSubjects";
import { getErrorMessage } from "@/shared/api/errors";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import InfoTip from "@/shared/ui/InfoTip";

type Touched = Partial<Record<"name" | "code", boolean>>;

export default function AddSubject() {
  usePageTitle("Add subject");
  const navigate = useNavigate();
  const createSubject = useCreateSubject();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("");
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (field: keyof Touched) => setTouched((t) => ({ ...t, [field]: true }));

  const nameInvalid = !!touched.name && !name.trim();
  const codeInvalid = !!touched.code && !code.trim();

  const isValid = name.trim() && code.trim();

  const handleSave = () => {
    setTouched({ name: true, code: true });
    if (!isValid) return;
    createSubject.mutate(
      { name: name.trim(), code: code.trim(), type: type.trim(), max_marks: maxMarks },
      { onSuccess: () => navigate("/subjects") },
    );
  };

  const error = createSubject.isError
    ? getErrorMessage(createSubject.error, "Failed to create subject")
    : null;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Add new subject</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Add a subject to the catalogue.
            <InfoTip>To offer it to students, add it to a selection group under Curriculum.</InfoTip>
          </div>
        </div>
        <Button
          renderIcon={ArrowLeft}
          kind="ghost"
          size="md"
          as={Link}
          to="/subjects"
        >
          Back
        </Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Subject information</div>
          <div className="os-form__section-body">
            <TextInput
              id="subject-name"
              labelText="Subject name"
              placeholder="e.g. Mathematics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched("name")}
              invalid={nameInvalid}
              invalidText="Subject name is required."
            />
            <TextInput
              id="subject-code"
              labelText="Subject code"
              placeholder="e.g. MATH-01"
              helperText="Any code your school uses. Must be unique."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => markTouched("code")}
              invalid={codeInvalid}
              invalidText="Subject code is required."
            />
            <TextInput
              id="subject-type"
              labelText="Type (optional)"
              placeholder="e.g. core"
              helperText="A descriptive label only, e.g. core, language, aesthetic."
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
            <NumberInput
              id="subject-max-marks"
              label="Max marks"
              min={1}
              max={1000}
              value={maxMarks}
              onChange={(_e, { value }) => setMaxMarks(Number(value ?? 100))}
              helperText="The maximum marks a student can get for this subject."
            />
          </div>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Could not create subject"
            subtitle={error}
            lowContrast
            onClose={() => createSubject.reset()} className="os-max-w-full"
          />
        )}

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            disabled={!isValid || createSubject.isPending}
            onClick={handleSave}
          >
            {createSubject.isPending ? "Saving…" : "Save subject"}
          </Button>
          <Button kind="secondary" as={Link} to="/subjects">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
