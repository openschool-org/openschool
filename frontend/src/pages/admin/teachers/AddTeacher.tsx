import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  TextInput,
  PasswordInput,
  DatePicker,
  DatePickerInput,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useCreateTeacher } from "../../../queries/useTeachers";
import { AxiosError } from "axios";

export default function AddTeacher() {
  const navigate = useNavigate();
  const createTeacher = useCreateTeacher();

  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [joinedDate, setJoinedDate] = useState("");

  const handleSubmit = () => {
    createTeacher.mutate(
      {
        given_name: givenName.trim(),
        family_name: familyName.trim(),
        email: email.trim(),
        phone_number: phone.trim() || undefined,
        password,
        employee_number: employeeNumber.trim(),
        joined_date: new Date(joinedDate).toISOString(),
      },
      { onSuccess: () => navigate("/teachers") },
    );
  };

  const errorMessage = createTeacher.isError
    ? (createTeacher.error as AxiosError<{ error: string }>).response?.data
        ?.error ?? "Failed to create teacher"
    : null;

  const isValid =
    givenName.trim() &&
    familyName.trim() &&
    email.trim() &&
    password &&
    employeeNumber.trim() &&
    joinedDate;

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
            <TextInput
              id="given-name"
              labelText="First Name"
              placeholder="e.g. Priya"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
            />
            <TextInput
              id="family-name"
              labelText="Last Name"
              placeholder="e.g. Rathnayake"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
            <TextInput
              id="email"
              labelText="Email Address"
              placeholder="e.g. teacher@school.lk"
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
            <div className="os-form__full-col">
              <PasswordInput
                id="password"
                labelText="Password"
                placeholder="Set an initial password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
