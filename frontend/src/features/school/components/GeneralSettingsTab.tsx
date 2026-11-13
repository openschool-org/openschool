import { useState } from "react";
import { Alert, Button, Card, Col, Row } from "antd";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import LogoUpload from "@/features/school/components/LogoUpload";
import { isNotFoundError } from "@/shared/api/errors";
import { useSchool, useUpdateSchool, useCreateSchool } from "@/features/school/queries/useSchool";
import type { School } from "@/features/school/api/school";
import SchoolInfoCard, { type SchoolFormValues } from "@/features/school/components/SchoolInfoCard";
import AcademicSettingsCard from "@/features/school/components/AcademicSettingsCard";
import { gradeRangeErrors } from "@/features/school/lib/gradeRange";
import SystemInfoCards from "@/features/school/components/SystemInfoCards";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useToast } from "@/shared/ui/toast/useToast";

type SettingsForm = SchoolFormValues & { grade_from: number | ""; grade_to: number | "" };

const EMPTY_FORM: SettingsForm = { name: "", address: "", phone: "", email: "", logo_url: "", school_type: "mixed", grade_from: "", grade_to: "" };

const schoolToForm = (s: School): SettingsForm => ({
  name: s.name,
  address: s.address ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  logo_url: s.logo_url ?? "",
  school_type: s.school_type ?? "mixed",
  grade_from: s.grade_from ?? "",
  grade_to: s.grade_to ?? "",
});

// School profile and academic range; also the first-run "create school" form.
export default function GeneralSettingsTab() {
  const { data: school, isLoading, isError, error, refetch } = useSchool();
  const updateSchool = useUpdateSchool();
  const createSchool = useCreateSchool();
  const noSchoolYet = isNotFoundError(error);

  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (school && loadedFor !== school.id) {
    setForm(schoolToForm(school));
    setLoadedFor(school.id);
  }

  const editable = editing || noSchoolYet;
  const rangeInvalid = gradeRangeErrors(form.grade_from, form.grade_to).invalid;
  const pending = updateSchool.isPending || createSchool.isPending;

  const flashSaved = () => {
    setEditing(false);
    showToast({ kind: "success", title: "Saved" });
  };

  const save = () => {
    if (rangeInvalid || !form.name.trim()) return;
    const data = {
      ...form,
      grade_from: form.grade_from === "" ? null : Number(form.grade_from),
      grade_to: form.grade_to === "" ? null : Number(form.grade_to),
    };
    if (noSchoolYet) createSchool.mutate(data, { onSuccess: flashSaved });
    else if (school) updateSchool.mutate({ id: school.id, data }, { onSuccess: flashSaved });
  };

  const set = <K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) => setForm((f) => ({ ...f, [field]: value }));
  const actions = noSchoolYet ? (
    <Button type="primary" icon={<SaveOutlined />} onClick={save} loading={pending} disabled={rangeInvalid || !form.name.trim()}>Create school</Button>
  ) : editing ? (
    <div className="os-flex os-gap-2">
      <Button onClick={() => { if (school) setForm(schoolToForm(school)); setEditing(false); }} disabled={pending}>Cancel</Button>
      <Button type="primary" icon={<SaveOutlined />} onClick={save} loading={pending} disabled={rangeInvalid || !form.name.trim()}>Save</Button>
    </div>
  ) : (
    <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>Edit</Button>
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError && !noSchoolYet) return <ErrorMessage message="Could not load school information." onRetry={refetch} />;

  return (
    <div className="os-stack os-gap-4">
      {noSchoolYet && <Alert type="info" showIcon title="No school set up yet" description="Fill in your school's details below and create it to finish setup." />}
      <MutationErrorNotification isError={createSchool.isError} error={createSchool.error} title="Could not create school" />
      <MutationErrorNotification isError={updateSchool.isError} error={updateSchool.error} title="Could not save changes" />

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card className="os-form-card" title="School information" extra={actions}>
            <SchoolInfoCard values={form} editing={editable} onChange={(field, value) => set(field, value as never)} />
          </Card>
          <Card className="os-form-card" title="Academic settings">
            <AcademicSettingsCard gradeFrom={form.grade_from} gradeTo={form.grade_to} editable={editable} onChange={(field, value) => set(field, value)} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="os-form-card" title="Logo">
            <LogoUpload value={form.logo_url} editing={editable} onChange={(v) => set("logo_url", v)} />
          </Card>
          <SystemInfoCards />
        </Col>
      </Row>
    </div>
  );
}
