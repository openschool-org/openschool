import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  TextInput,
  PasswordInput,
  Select,
  SelectItem,
  RadioButtonGroup,
  RadioButton,
  DatePicker,
  DatePickerInput,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useCreateTeacher } from "../../../queries/useTeachers";
import { getErrorMessage } from "../../../lib/errorMessage";
import type { TeacherTitle } from "../../../services/teacher";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TITLES: TeacherTitle[] = ["Mr", "Miss", "Mrs", "Ms", "Dr", "Von", "Prof"];

type Touched = Partial<
  Record<"givenName" | "familyName" | "email" | "password" | "employeeNumber" | "joinedDate", boolean>
>;

export default function AddTeacher() {
  const navigate = useNavigate();
  const createTeacher = useCreateTeacher();

  const [title, setTitle] = useState<TeacherTitle | "">("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [joinedDate, setJoinedDate] = useState("");
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (field: keyof Touched) => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = () => {
    setTouched({
      givenName: true,
      familyName: true,
      email: true,
      password: true,
      employeeNumber: true,
      joinedDate: true,
    });
    if (!isValid) return;
    createTeacher.mutate(
      {
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        email: email.trim(),
        phone_number: phone.trim() || undefined,
        password,
        employee_number: employeeNumber.trim(),
        joined_date: new Date(joinedDate).toISOString(),
        title: title || undefined,
        gender: gender || undefined,
      },
      { onSuccess: () => navigate("/teachers") },
    );
  };

  const errorMessage = createTeacher.isError
    ? getErrorMessage(createTeacher.error, "Failed to create teacher")
    : null;

  const givenNameInvalid = !!touched.givenName && !givenName.trim();
  const familyNameInvalid = !!touched.familyName && !familyName.trim();
  const emailInvalid = !!touched.email && !EMAIL_RE.test(email.trim());
  const passwordInvalid = !!touched.password && password.length < 8;
  const employeeNumberInvalid = !!touched.employeeNumber && !employeeNumber.trim();
  const joinedDateInvalid = !!touched.joinedDate && !joinedDate;

  const isValid =
    givenName.trim().length > 0 &&
    familyName.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    password.length >= 8 &&
    employeeNumber.trim().length > 0 &&
    !!joinedDate;

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
          <p className="os-page__subtitle">Create a teacher account and profile</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/teachers">
          Back
        </Button>
      </div>

      <div className="os-form">
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
            <Select
              id="title"
              labelText="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value as TeacherTitle | "")}
            >
              <SelectItem value="" text="None" />
              {TITLES.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>
            <RadioButtonGroup
              legendText="Gender (optional)"
              name="gender"
              valueSelected={gender}
              onChange={(value) => setGender(value as "male" | "female")}
            >
              <RadioButton id="gender-male" labelText="Male" value="male" />
              <RadioButton id="gender-female" labelText="Female" value="female" />
            </RadioButtonGroup>
            <TextInput
              id="given-name"
              labelText="First Name"
              placeholder="e.g. Priya"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              onBlur={() => markTouched("givenName")}
              invalid={givenNameInvalid}
              invalidText="First name is required."
            />
            <TextInput
              id="family-name"
              labelText="Last Name"
              placeholder="e.g. Rathnayake"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              onBlur={() => markTouched("familyName")}
              invalid={familyNameInvalid}
              invalidText="Last name is required."
            />
            <TextInput
              id="email"
              labelText="Email Address"
              placeholder="e.g. teacher@school.lk"
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
            />
            <div className="os-form__full-col">
              <PasswordInput
                id="password"
                labelText="Password"
                placeholder="Set an initial password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched("password")}
                invalid={passwordInvalid}
                invalidText="Password must be at least 8 characters."
              />
            </div>
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Employment Details</div>
          <div className="os-form__section-body">
            <TextInput
              id="employee-number"
              labelText="Employee Number"
              placeholder="e.g. EMP-0145"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              onBlur={() => markTouched("employeeNumber")}
              invalid={employeeNumberInvalid}
              invalidText="Employee number is required."
            />
            <DatePicker
              datePickerType="single"
              dateFormat="Y-m-d"
              value={joinedDate}
              onChange={(dates) => {
                const d = dates[0];
                setJoinedDate(
                  d
                    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
                    : "",
                );
              }}
            >
              <DatePickerInput
                id="joined-date"
                labelText="Joining Date"
                placeholder="YYYY-MM-DD"
                onBlur={() => markTouched("joinedDate")}
                invalid={joinedDateInvalid}
                invalidText="Joining date is required."
              />
            </DatePicker>
          </div>
        </div>

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            onClick={handleSubmit}
            disabled={!isValid || createTeacher.isPending}
          >
            {createTeacher.isPending ? "Saving…" : "Save Teacher"}
          </Button>
          <Button kind="secondary" as={Link} to="/teachers">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
