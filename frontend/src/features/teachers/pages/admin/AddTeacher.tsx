import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Card, Col, Radio, Row } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useCreateTeacher } from "@/features/teachers/queries/useTeachers";
import { getErrorMessage } from "@/shared/api/errors";
import { EMAIL_RE } from "@/shared/lib/validation";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import type { TeacherTitle } from "@/features/teachers/api/teacher";
import { TITLES } from "@/features/teachers/constants";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { EMPTY_PERSON_NAMES } from "@/shared/lib/name";
import DateField from "@/shared/ui/DateField";
import Field from "@/shared/ui/Field";
import LinkButton from "@/shared/ui/LinkButton";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";

type Touched = Partial<
  Record<"fullName" | "email" | "phone" | "nicNumber" | "joinedDate", boolean>
>;

export default function AddTeacher() {
  usePageTitle("Add teacher");
  const navigate = useNavigate();
  const createTeacher = useCreateTeacher();

  const [title, setTitle] = useState<TeacherTitle | "">("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [names, setNames] = useState(EMPTY_PERSON_NAMES);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nicNumber, setNicNumber] = useState("");
  const [joinedDate, setJoinedDate] = useState("");
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (field: keyof Touched) => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = () => {
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      nicNumber: true,
      joinedDate: true,
    });
    if (!isValid) return;
    createTeacher.mutate(
      {
        full_name: names.full_name.trim(),
        name_with_initials: names.name_with_initials.trim() || undefined,
        calling_name: names.calling_name.trim() || undefined,
        email: email.trim(),
        phone_number: phone.trim() || undefined,
        nic_number: nicNumber.trim(),
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

  const fullNameInvalid = !!touched.fullName && !names.full_name.trim();
  const emailInvalid = !!touched.email && !EMAIL_RE.test(email.trim());
  const phoneInvalid = !!touched.phone && !isValidSriLankanPhone(phone);
  const nicNumberInvalid = !!touched.nicNumber && !nicNumber.trim();
  const joinedDateInvalid = !!touched.joinedDate && !joinedDate;

  const isValid =
    names.full_name.trim().length > 0 &&
    EMAIL_RE.test(email.trim()) &&
    isValidSriLankanPhone(phone) &&
    nicNumber.trim().length > 0 &&
    !!joinedDate;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Add new teacher</h1>
          <p className="os-page__subtitle">Create a teacher account and profile</p>
        </div>
        <LinkButton to="/teachers" type="text" icon={<ArrowLeftOutlined />}>Back</LinkButton>
      </div>

      {errorMessage && <Alert type="error" showIcon className="os-mb-6" title="Error" description={errorMessage} />}

      <Row gutter={24} className="os-form-columns">
        <Col xs={24} lg={12}>
          <Card className="os-form-card" title="Personal details">
            <div className="os-stack os-gap-5">
              <SelectField
                id="title"
                label="Title (optional)"
                size="large"
                value={title}
                onChange={(v) => setTitle(v as TeacherTitle | "")}
                options={[{ value: "", label: "None" }, ...TITLES.map((t) => ({ value: t, label: t }))]}
              />
              <Field id="gender" label="Gender (optional)">
                <Radio.Group id="gender" value={gender || undefined} onChange={(e) => setGender(e.target.value)}>
                  <Radio value="male">Male</Radio>
                  <Radio value="female">Female</Radio>
                </Radio.Group>
              </Field>
              <PersonNameFields
                idPrefix="teacher"
                value={names}
                onChange={setNames}
                fullNameInvalid={fullNameInvalid}
                onFullNameBlur={() => markTouched("fullName")}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="os-form-card" title="Account and employment">
            <div className="os-stack os-gap-5">
              <TextField
                id="email"
                size="large"
                label="Email address"
                placeholder="e.g. teacher@school.lk"
                value={email}
                onChange={setEmail}
                onBlur={() => markTouched("email")}
                invalid={emailInvalid}
                invalidText="Enter a valid email address."
              />
              <TextField
                id="phone"
                size="large"
                label="Phone (optional)"
                placeholder="e.g. 077 123 4567"
                value={phone}
                onChange={setPhone}
                onBlur={() => markTouched("phone")}
                invalid={phoneInvalid}
                invalidText={PHONE_INVALID_TEXT}
              />
              <TextField
                id="nic-number"
                size="large"
                label="NIC number"
                placeholder="e.g. 199012345678 or 901234567V"
                value={nicNumber}
                onChange={setNicNumber}
                onBlur={() => markTouched("nicNumber")}
                invalid={nicNumberInvalid}
                invalidText="NIC number is required."
                helperText="Used as the teacher's initial one-time password."
              />
              <DateField
                id="joined-date"
                labelText="Joining date"
                size="lg"
                value={joinedDate}
                onChange={setJoinedDate}
                onBlur={() => markTouched("joinedDate")}
                invalid={joinedDateInvalid}
                invalidText="Joining date is required."
              />
            </div>
          </Card>
        </Col>
      </Row>

      <div className="os-form-actions">
        <Button size="large" type="primary" icon={<SaveOutlined />} onClick={handleSubmit} disabled={!isValid} loading={createTeacher.isPending}>
          Save teacher
        </Button>
        <LinkButton to="/teachers" size="large">Cancel</LinkButton>
      </div>
    </div>
  );
}
