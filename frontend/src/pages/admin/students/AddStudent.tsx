import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  TextInput,
  TextArea,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useCreateStudent } from "../../../queries/useStudents";
import { AxiosError } from "axios";

export default function AddStudent() {
  const navigate = useNavigate();
  const createStudent = useCreateStudent();

  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [specialRemarks, setSpecialRemarks] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");

  const handleSubmit = () => {
    createStudent.mutate(
      {
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        email: email.trim(),
        phone_number: phone.trim() || undefined,
        // initial password is the index number; the student changes it later
        password: indexNumber.trim(),
        index_number: indexNumber.trim(),
        address: address.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        special_remarks: specialRemarks.trim() || undefined,
        gender: gender || undefined,
      },
      { onSuccess: () => navigate("/students") },
    );
  };

  const errorMessage = createStudent.isError
    ? (createStudent.error as AxiosError<{ error: string }>).response?.data
        ?.error ?? "Failed to enrol student"
    : null;

  const isValid =
    givenName.trim() && familyName.trim() && email.trim() && indexNumber.trim();

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
          <p className="os-page__subtitle">Create a student account and profile</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/students">
          Back
        </Button>
      </div>

      <div className="os-form">
        <InlineNotification
          kind="info"
          title="Initial password"
          subtitle="The student signs in with their index number as the password, and should change it on first login."
          lowContrast
          hideCloseButton
          // .os-form has no gap — sections carry their own margin, so match it
          style={{ maxWidth: "100%", marginBottom: "1.5rem" }}
        />

        {errorMessage && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={errorMessage}
            lowContrast
            hideCloseButton
          />
        )}

        <div className="os-form__section">
          <div className="os-form__section-header">Account</div>
          <div className="os-form__section-body">
            <TextInput
              id="given-name"
              labelText="First Name"
              placeholder="e.g. Kavinda"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
            />
            <TextInput
              id="family-name"
              labelText="Last Name"
              placeholder="e.g. Perera"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
            <TextInput
              id="email"
              labelText="Email Address"
              placeholder="e.g. student@school.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextInput
              id="phone"
              labelText="Phone (optional)"
              placeholder="e.g. 077 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Student Profile</div>
          <div className="os-form__section-body">
            <TextInput
              id="index-number"
              labelText="Index Number"
              placeholder="e.g. 2026/0145"
              helperText="Also used as the student's initial password."
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
            />
            <TextInput
              id="whatsapp"
              labelText="WhatsApp (optional)"
              placeholder="e.g. 077 123 4567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <RadioButtonGroup
              legendText="Gender (optional)"
              name="gender"
              valueSelected={gender}
              onChange={(value) => setGender(value as "male" | "female")}
            >
              <RadioButton id="gender-male" labelText="Male" value="male" />
              <RadioButton id="gender-female" labelText="Female" value="female" />
            </RadioButtonGroup>
            <div className="os-form__full-col">
              <TextInput
                id="address"
                labelText="Address (optional)"
                placeholder="e.g. 23, Kandy Road, Kelaniya"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="os-form__full-col">
              <TextArea
                id="special-remarks"
                labelText="Special Remarks (optional)"
                placeholder="Any notes about the student"
                rows={3}
                value={specialRemarks}
                onChange={(e) => setSpecialRemarks(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            onClick={handleSubmit}
            disabled={!isValid || createStudent.isPending}
          >
            {createStudent.isPending ? "Saving…" : "Save & Enrol"}
          </Button>
          <Button kind="secondary" as={Link} to="/students">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
