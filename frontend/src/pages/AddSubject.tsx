import { Link, useNavigate } from "react-router";
import { Button, TextInput, Select, SelectItem, Checkbox, RadioButton, RadioButtonGroup } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";

const GRADES = ["Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","Grade 13"];

export default function AddSubject() {
  const navigate = useNavigate();

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
          <p className="os-page__subtitle">Define a subject and assign it to grades</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/subjects">Back</Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Subject Information</div>
          <div className="os-form__section-body">
            <TextInput id="subject-name" labelText="Subject Name" placeholder="e.g. Mathematics" />
            <TextInput id="subject-code" labelText="Subject Code" placeholder="e.g. MATH" />
            <div className="os-form__full-col">
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616", marginBottom: "0.5rem" }}>Subject Type</p>
              <RadioButtonGroup name="subject-type" defaultSelected="core" orientation="horizontal">
                <RadioButton labelText="Core (mandatory)" value="core" id="type-core" />
                <RadioButton labelText="Optional (elective)" value="optional" id="type-optional" />
              </RadioButtonGroup>
            </div>
            <Select id="medium" labelText="Medium of Instruction" defaultValue="">
              <SelectItem value="" text="Select…" />
              <SelectItem value="sinhala" text="Sinhala" />
              <SelectItem value="english" text="English" />
              <SelectItem value="tamil" text="Tamil" />
            </Select>
            <Select id="category" labelText="Category" defaultValue="">
              <SelectItem value="" text="Select…" />
              <SelectItem value="languages" text="Languages" />
              <SelectItem value="mathematics" text="Mathematics" />
              <SelectItem value="sciences" text="Sciences" />
              <SelectItem value="humanities" text="Humanities" />
              <SelectItem value="practical" text="Practical Arts" />
              <SelectItem value="commerce" text="Commerce" />
              <SelectItem value="ict" text="ICT" />
            </Select>
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Grade Assignment</div>
          <div className="os-form__section-body">
            <div className="os-form__full-col">
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616", marginBottom: "0.75rem" }}>
                Applicable to grades
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
                {GRADES.map(g => (
                  <Checkbox key={g} id={`grade-${g}`} labelText={g} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Optional — Subject Bucket</div>
          <div className="os-form__section-body">
            <div className="os-form__full-col">
              <p style={{ fontSize: "0.8125rem", color: "#525252", marginBottom: "1rem" }}>
                If this is an optional subject, you can group it into a subject bucket so students choose one from the group.
              </p>
            </div>
            <Select id="bucket" labelText="Subject Bucket (optional)" defaultValue="">
              <SelectItem value="" text="No bucket / Not applicable" />
              <SelectItem value="bucket-a" text="A/L Science Electives" />
              <SelectItem value="bucket-b" text="A/L Arts Electives" />
              <SelectItem value="bucket-c" text="O/L Optional Group" />
            </Select>
            <div />
          </div>
        </div>

        <div className="os-form__actions">
          <Button renderIcon={Save} kind="primary" onClick={() => navigate("/subjects")}>
            Save Subject
          </Button>
          <Button kind="secondary" as={Link} to="/subjects">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
