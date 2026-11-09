import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Card } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import NumberField from "@/shared/ui/NumberField";
import TextField from "@/shared/ui/TextField";
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
        <LinkButton to="/subjects" type="text" icon={<ArrowLeftOutlined />}>Back</LinkButton>
      </div>

      {error && <Alert type="error" showIcon closable onClose={() => createSubject.reset()} className="os-mb-6" title="Could not create subject" description={error} />}

      <Card className="os-form-card" title="Subject information">
        <div className="os-modal-form">
          <TextField
            id="subject-name"
            size="large"
            label="Subject name"
            placeholder="e.g. Mathematics"
            value={name}
            onChange={setName}
            onBlur={() => markTouched("name")}
            invalid={nameInvalid}
            invalidText="Subject name is required."
          />
          <TextField
            id="subject-code"
            size="large"
            label="Subject code"
            placeholder="e.g. MATH-01"
            helperText="Any code your school uses. Must be unique."
            value={code}
            onChange={setCode}
            onBlur={() => markTouched("code")}
            invalid={codeInvalid}
            invalidText="Subject code is required."
          />
          <TextField
            id="subject-type"
            size="large"
            label="Type (optional)"
            placeholder="e.g. core"
            helperText="A descriptive label only, e.g. core, language, aesthetic."
            value={type}
            onChange={setType}
          />
          <NumberField
            id="subject-max-marks"
            size="large"
            label="Max marks"
            min={1}
            max={1000}
            value={maxMarks}
            onChange={(value) => setMaxMarks(Number(value ?? 100))}
            helperText="The maximum marks a student can get for this subject."
          />
        </div>
      </Card>

      <div className="os-form-actions">
        <Button size="large" type="primary" icon={<SaveOutlined />} disabled={!isValid} loading={createSubject.isPending} onClick={handleSave}>
          {createSubject.isPending ? "Saving…" : "Save subject"}
        </Button>
        <LinkButton to="/subjects" size="large">Cancel</LinkButton>
      </div>
    </div>
  );
}
