import { Link, useNavigate } from "react-router";
import { Button, Select, SelectItem, TextInput, Checkbox, RadioButton, RadioButtonGroup } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";

const SUBJECTS = ["Mathematics", "Science", "English", "Sinhala", "Tamil", "History", "Geography", "Art", "Music", "Physical Education", "ICT"];
const GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Grade 13"];

export default function AddTeacher() {
  const navigate = useNavigate();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <div className="os-page__breadcrumb">
            <Link to="/teachers">Teachers</Link>
            <span>/</span>
            <span>Add Teacher</span>
          </div>
          <h1 className="os-page__title">Add New Teacher</h1>
          <p className="os-page__subtitle">Create a teacher profile and assign subjects</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/teachers">
          Back
        </Button>
      </div>

      <div className="os-form">
        {/* Personal Information */}
        <div className="os-form__section">
          <div className="os-form__section-header">Personal Information</div>
          <div className="os-form__section-body">
            <TextInput id="first-name" labelText="First Name" placeholder="e.g. Priya" />
            <TextInput id="last-name" labelText="Last Name" placeholder="e.g. Rathnayake" />
            <TextInput id="dob" labelText="Date of Birth" placeholder="YYYY-MM-DD" />
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616", marginBottom: "0.5rem" }}>Gender</p>
              <RadioButtonGroup name="gender" defaultSelected="female" orientation="horizontal">
                <RadioButton labelText="Male" value="male" id="t-male" />
                <RadioButton labelText="Female" value="female" id="t-female" />
              </RadioButtonGroup>
            </div>
            <TextInput id="nic" labelText="NIC Number" placeholder="e.g. 198512345678" />
            <TextInput id="phone" labelText="Phone" placeholder="e.g. 077 123 4567" />
            <div className="os-form__full-col">
              <TextInput id="email" labelText="Email Address" placeholder="e.g. teacher@school.lk" />
            </div>
          </div>
        </div>

        {/* Employment */}
        <div className="os-form__section">
          <div className="os-form__section-header">Employment Details</div>
          <div className="os-form__section-body">
            <TextInput id="employee-id" labelText="Employee ID" placeholder="Auto-generated if blank" />
            <TextInput id="join-date" labelText="Joining Date" placeholder="YYYY-MM-DD" />
            <Select id="employment-type" labelText="Employment Type" defaultValue="">
              <SelectItem value="" text="Select…" />
              <SelectItem value="permanent" text="Permanent" />
              <SelectItem value="contract" text="Contract" />
              <SelectItem value="visiting" text="Visiting" />
            </Select>
            <Select id="department" labelText="Department" defaultValue="">
              <SelectItem value="" text="Select…" />
              <SelectItem value="science" text="Science" />
              <SelectItem value="arts" text="Arts & Humanities" />
              <SelectItem value="languages" text="Languages" />
              <SelectItem value="mathematics" text="Mathematics" />
              <SelectItem value="practical" text="Practical Arts" />
            </Select>
          </div>
        </div>

        {/* Subject Assignment */}
        <div className="os-form__section">
          <div className="os-form__section-header">Subject Assignment</div>
          <div className="os-form__section-body">
            <div className="os-form__full-col">
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616", marginBottom: "0.75rem" }}>
                Subjects this teacher can teach
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                {SUBJECTS.map(s => (
                  <Checkbox key={s} id={`sub-${s}`} labelText={s} />
                ))}
              </div>
            </div>
            <div className="os-form__full-col">
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616", marginBottom: "0.75rem" }}>
                Grades this teacher handles
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
                {GRADES.map(g => (
                  <Checkbox key={g} id={`grade-${g}`} labelText={g} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="os-form__actions">
          <Button renderIcon={Save} kind="primary" onClick={() => navigate("/teachers")}>
            Save Teacher
          </Button>
          <Button kind="secondary" as={Link} to="/teachers">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
