import { Link, useNavigate } from "react-router";
import { Button, Select, SelectItem, TextInput, RadioButton, RadioButtonGroup } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";

export default function AddStudent() {
  const navigate = useNavigate();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <div className="os-page__breadcrumb">
            <Link to="/students">Students</Link>
            <span>/</span>
            <span>Enrol New Student</span>
          </div>
          <h1 className="os-page__title">Enrol New Student</h1>
          <p className="os-page__subtitle">Add a student record and assign them to a class</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/students">
          Back
        </Button>
      </div>

      <div className="os-form">
        {/* Personal Information */}
        <div className="os-form__section">
          <div className="os-form__section-header">Personal Information</div>
          <div className="os-form__section-body">
            <TextInput id="first-name" labelText="First Name" placeholder="e.g. Kavinda" />
            <TextInput id="last-name" labelText="Last Name" placeholder="e.g. Perera" />
            <TextInput id="dob" labelText="Date of Birth" placeholder="YYYY-MM-DD" />
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616", marginBottom: "0.5rem" }}>Gender</p>
              <RadioButtonGroup name="gender" defaultSelected="male" orientation="horizontal">
                <RadioButton labelText="Male" value="male" id="male" />
                <RadioButton labelText="Female" value="female" id="female" />
                <RadioButton labelText="Other" value="other" id="other" />
              </RadioButtonGroup>
            </div>
            <TextInput id="nic" labelText="NIC / Birth Certificate No." placeholder="e.g. 200012345678" />
            <TextInput id="phone" labelText="Contact Phone" placeholder="e.g. 077 123 4567" />
          </div>
        </div>

        {/* Address */}
        <div className="os-form__section">
          <div className="os-form__section-header">Address</div>
          <div className="os-form__section-body">
            <div className="os-form__full-col">
              <TextInput id="address-line1" labelText="Address Line 1" placeholder="Street / Lane" />
            </div>
            <TextInput id="city" labelText="City / Town" placeholder="e.g. Colombo" />
            <Select id="district" labelText="District" defaultValue="">
              <SelectItem value="" text="Select district…" />
              <SelectItem value="colombo" text="Colombo" />
              <SelectItem value="gampaha" text="Gampaha" />
              <SelectItem value="kalutara" text="Kalutara" />
              <SelectItem value="kandy" text="Kandy" />
              <SelectItem value="galle" text="Galle" />
              <SelectItem value="matara" text="Matara" />
            </Select>
          </div>
        </div>

        {/* Class Enrolment */}
        <div className="os-form__section">
          <div className="os-form__section-header">Class Enrolment</div>
          <div className="os-form__section-body">
            <Select id="grade" labelText="Grade" defaultValue="">
              <SelectItem value="" text="Select grade…" />
              {["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Grade 13"].map(g => (
                <SelectItem key={g} value={g.toLowerCase().replace(" ", "-")} text={g} />
              ))}
            </Select>
            <Select id="class" labelText="Class" defaultValue="">
              <SelectItem value="" text="Select class…" />
              <SelectItem value="10a" text="10-A" />
              <SelectItem value="10b" text="10-B" />
            </Select>
            <TextInput id="admission-no" labelText="Admission Number" placeholder="Auto-generated if blank" />
            <TextInput id="admission-date" labelText="Admission Date" placeholder="YYYY-MM-DD" />
          </div>
        </div>

        {/* Guardian */}
        <div className="os-form__section">
          <div className="os-form__section-header">Guardian / Parent</div>
          <div className="os-form__section-body">
            <TextInput id="guardian-name" labelText="Guardian Full Name" placeholder="e.g. Saman Perera" />
            <Select id="guardian-relation" labelText="Relationship" defaultValue="">
              <SelectItem value="" text="Select…" />
              <SelectItem value="father" text="Father" />
              <SelectItem value="mother" text="Mother" />
              <SelectItem value="guardian" text="Legal Guardian" />
            </Select>
            <TextInput id="guardian-phone" labelText="Guardian Phone" placeholder="e.g. 071 234 5678" />
            <TextInput id="guardian-email" labelText="Guardian Email (optional)" placeholder="e.g. parent@example.com" />
          </div>
        </div>

        <div className="os-form__actions">
          <Button renderIcon={Save} kind="primary" onClick={() => navigate("/students")}>
            Save &amp; Enrol
          </Button>
          <Button kind="secondary" as={Link} to="/students">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
