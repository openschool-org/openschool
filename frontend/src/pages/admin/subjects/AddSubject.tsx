import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, TextInput, InlineNotification } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { AxiosError } from "axios";
import { useCreateSubject } from "../../../queries/useSubjects";

export default function AddSubject() {
  const navigate = useNavigate();
  const createSubject = useCreateSubject();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("");

  const isValid = name.trim() && code.trim();

  const handleSave = () => {
    createSubject.mutate(
      { name: name.trim(), code: code.trim(), type: type.trim() },
      { onSuccess: () => navigate("/subjects") },
    );
  };

  const error = createSubject.isError
    ? ((createSubject.error as AxiosError<{ error: string }>).response?.data
        ?.error ?? "Failed to create subject")
    : null;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <div className="os-page__breadcrumb">
            <Link to="/subjects">Subjects</Link>
            <span>/</span>
            <span>Add Subject</span>
          </div>
          <h1 className="os-page__title">Add New Subject</h1>
          <p className="os-page__subtitle">
            Add a subject to the catalogue. Offer it to students by adding it to
            a selection group under Curriculum.
          </p>
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
          <div className="os-form__section-header">Subject Information</div>
          <div className="os-form__section-body">
            <TextInput
              id="subject-name"
              labelText="Subject Name"
              placeholder="e.g. Mathematics"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextInput
              id="subject-code"
              labelText="Subject Code"
              placeholder="e.g. MATH-01"
              helperText="Any code your school uses. Must be unique."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <TextInput
              id="subject-type"
              labelText="Type (optional)"
              placeholder="e.g. core"
              helperText="A descriptive label only, e.g. core, language, aesthetic."
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Could not create subject"
            subtitle={error}
            lowContrast
            onClose={() => createSubject.reset()}
            style={{ maxWidth: "100%" }}
          />
        )}

        {!isValid && (
          <InlineNotification
            kind="info"
            title="Required fields"
            subtitle="Subject name and code are required to save."
            lowContrast
            hideCloseButton
            style={{ maxWidth: "100%" }}
          />
        )}

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            disabled={!isValid || createSubject.isPending}
            onClick={handleSave}
          >
            {createSubject.isPending ? "Saving…" : "Save Subject"}
          </Button>
          <Button kind="secondary" as={Link} to="/subjects">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
