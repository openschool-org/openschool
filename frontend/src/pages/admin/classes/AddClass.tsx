import { Link, useNavigate } from "react-router";
import { Button, Select, SelectItem, TextInput } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";

const TEACHERS = [
  "Priya Rathnayake",
  "Suresh Dissanayake",
  "Chamari Wickramasinghe",
  "Nimal Jayasuriya",
  "Anoma de Silva",
];

export default function AddClass() {
  const navigate = useNavigate();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <div className="os-page__breadcrumb">
            <Link to="/classes">Classes</Link>
            <span>/</span>
            <span>Add Class</span>
          </div>
          <h1 className="os-page__title">Add New Class</h1>
          <p className="os-page__subtitle">Create a class for the current academic year</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/classes">
          Back
        </Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Class Details</div>
          <div className="os-form__section-body">
            <Select id="grade" labelText="Grade" defaultValue="">
              <SelectItem value="" text="Select grade…" />
              {["Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","Grade 13"].map(g => (
                <SelectItem key={g} value={g} text={g} />
              ))}
            </Select>
            <TextInput id="class-name" labelText="Class Name" placeholder="e.g. 10-A" />
            <Select id="stream" labelText="Stream" defaultValue="">
              <SelectItem value="" text="Select stream…" />
              <SelectItem value="science" text="Science" />
              <SelectItem value="arts" text="Arts" />
              <SelectItem value="commerce" text="Commerce" />
              <SelectItem value="technology" text="Technology" />
              <SelectItem value="general" text="General" />
            </Select>
            <Select id="class-teacher" labelText="Class Teacher" defaultValue="">
              <SelectItem value="" text="Select teacher…" />
              {TEACHERS.map(t => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <TextInput id="room" labelText="Classroom / Room No." placeholder="e.g. Room 204" />
            <TextInput id="capacity" labelText="Max Capacity" placeholder="e.g. 45" type="number" />
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Academic Year</div>
          <div className="os-form__section-body">
            <Select id="academic-year" labelText="Academic Year" defaultValue="current">
              <SelectItem value="current" text="2025 / 2026 (Current)" />
              <SelectItem value="prev" text="2024 / 2025" />
            </Select>
            <div />
          </div>
        </div>

        <div className="os-form__actions">
          <Button renderIcon={Save} kind="primary" onClick={() => navigate("/classes")}>
            Create Class
          </Button>
          <Button kind="secondary" as={Link} to="/classes">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
