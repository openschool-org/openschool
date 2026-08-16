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
import { getErrorMessage } from "../../../lib/errorMessage";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "../../../lib/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Touched = Partial<
  Record<"givenName" | "familyName" | "email" | "phone" | "indexNumber" | "whatsapp", boolean>
>;

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
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (field: keyof Touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = () => {
    setTouched({
      givenName: true,
      familyName: true,
      email: true,
      phone: true,
      indexNumber: true,
      whatsapp: true,
    });
    if (!isValid) return;
    createStudent.mutate(
      {
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        email: email.trim(),
        phone_number: phone.trim() || undefined,
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
    ? getErrorMessage(createStudent.error, "Failed to enrol student")
    : null;

  const givenNameInvalid = !!touched.givenName && !givenName.trim();
  const familyNameInvalid = !!touched.familyName && !familyName.trim();
  const emailInvalid = !!touched.email && !EMAIL_RE.test(email.trim());
  const phoneInvalid = !!touched.phone && !isValidSriLankanPhone(phone);
  const indexNumberInvalid = !!touched.indexNumber && !indexNumber.trim();
  const whatsappInvalid = !!touched.whatsapp && !isValidSriLankanPhone(whatsapp);

  const isValid =
    givenName.trim().length > 0 &&
    familyName.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    isValidSriLankanPhone(phone) &&
    indexNumber.trim().length > 0 &&
    isValidSriLankanPhone(whatsapp);

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
          <p className="os-page__subtitle">
            Create a student account and profile
          </p>
        </div>
        <Button
          renderIcon={ArrowLeft}
          kind="ghost"
          size="md"
          as={Link}
          to="/students"
        >
          Back
        </Button>
      </div>

      <div className="os-form">
        <InlineNotification
          kind="info"
          title="Initial password"
          subtitle="The student's index number is their initial one-time password. They'll be prompted to change it on first sign-in."
          lowContrast
          hideCloseButton
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
              onBlur={() => markTouched("givenName")}
              invalid={givenNameInvalid}
              invalidText="First name is required."
            />
            <TextInput
              id="family-name"
              labelText="Last Name"
              placeholder="e.g. Perera"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              onBlur={() => markTouched("familyName")}
              invalid={familyNameInvalid}
              invalidText="Last name is required."
            />
            <TextInput
              id="email"
              labelText="Email Address"
              placeholder="e.g. student@school.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched("email")}
              invalid={emailInvalid}
              invalidText="Enter a valid email address."
            />
            <TextInput
              id="phone"
              labelText="Phone (optional)"
              placeholder="e.g. 077 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => markTouched("phone")}
              invalid={phoneInvalid}
              invalidText={PHONE_INVALID_TEXT}
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
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              onBlur={() => markTouched("indexNumber")}
              invalid={indexNumberInvalid}
              invalidText="Index number is required."
            />
            <TextInput
              id="whatsapp"
              labelText="WhatsApp (optional)"
              placeholder="e.g. 077 123 4567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              onBlur={() => markTouched("whatsapp")}
              invalid={whatsappInvalid}
              invalidText={PHONE_INVALID_TEXT}
            />
            <RadioButtonGroup
              legendText="Gender (optional)"
              name="gender"
              valueSelected={gender}
              onChange={(value) => setGender(value as "male" | "female")}
            >
              <RadioButton id="gender-male" labelText="Male" value="male" />
              <RadioButton
                id="gender-female"
                labelText="Female"
                value="female"
              />
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
