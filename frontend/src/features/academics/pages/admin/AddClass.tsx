import { useState } from "react";
import { useSearchParams } from "react-router";
import { Alert, Button, Card, Col, Row } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import SelectField from "@/shared/ui/SelectField";
import TextField from "@/shared/ui/TextField";
import { useStreams } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useCreateClassForm } from "@/features/academics/hooks/useCreateClassForm";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import InfoTip from "@/shared/ui/InfoTip";
import { displayName } from "@/shared/lib/name";

// Supports preselecting the grade via `?grade_id=`.
export default function AddClass() {
  const [searchParams] = useSearchParams();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: streams } = useStreams();
  const { data: mediums } = useMediums();
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const teachers = teacherPage?.items;
  const f = useCreateClassForm(searchParams.get("grade_id") ?? "");
  usePageTitle("Add class");
  const { form, set, touched } = f;
  const regularClassrooms = f.classrooms?.filter((c) => c.room_type === "regular");

  const roomHelp = !form.home_classroom_id && f.suggestedHomeClassroom
    ? "Suggested from the class name."
    : !form.home_classroom_id && form.name.trim()
      ? `A new room "${form.name.trim()}" will be created.`
      : "Students stay here all day; teachers move.";

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Add new class</h1>
          <p className="os-page__subtitle">Create a class for an academic year</p>
        </div>
        <LinkButton to="/classes" type="text" icon={<ArrowLeftOutlined />}>Back</LinkButton>
      </div>

      {f.error && <Alert type="error" showIcon closable onClose={f.clearError} className="os-mb-6" title="Could not create class" description={f.error} />}

      <Row gutter={24} className="os-form-columns">
        <Col xs={24} lg={12}>
          <Card className="os-form-card" title="Class details">
            <div className="os-stack os-gap-5">
              <SelectField
                id="grade"
                label="Grade"
                size="large"
                placeholder={gradesLoading ? "Loading grades…" : "Select grade…"}
                value={form.grade_id}
                onChange={(v) => { set("grade_id", v); f.markTouched("grade"); }}
                invalid={!!touched.grade && !form.grade_id}
                invalidText="A grade is required."
                options={(grades ?? []).map((g) => ({ value: g.id, label: g.name }))}
              />
              <SelectField
                id="academic-year"
                label="Academic year"
                size="large"
                placeholder="Select academic year…"
                value={f.academicYearId}
                onChange={(v) => { set("academic_year_id", v); f.markTouched("year"); }}
                invalid={!!touched.year && !f.academicYearId}
                invalidText="An academic year is required."
                options={(f.years ?? []).map((y) => ({ value: y.id, label: y.is_current ? `${y.label} (Current)` : y.label }))}
              />
              <TextField
                id="class-name"
                size="large"
                label="Class name"
                placeholder="e.g. 10-A"
                maxLength={20}
                value={form.name}
                onChange={(v) => set("name", v)}
                onBlur={() => f.markTouched("name")}
                invalid={!!touched.name && !form.name.trim()}
                invalidText="A class name is required."
              />
              <EntityCombobox
                id="class-teacher"
                labelText="Form teacher (optional)"
                items={teachers ?? []}
                selectedId={form.form_teacher_id}
                onSelect={(id) => set("form_teacher_id", id)}
                onSearch={setTeacherSearch}
                getId={(t) => t.id}
                itemToString={(t) => `${displayName(t)} - ${t.employee_number}`}
                placeholder="Search teachers by name or employee number…"
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card className="os-form-card" title="Stream, medium and room">
            <div className="os-stack os-gap-5">
              <SelectField
                id="stream"
                label="Stream (optional)"
                size="large"
                value={form.stream_id}
                onChange={(v) => set("stream_id", v)}
                options={[{ value: "", label: "No stream" }, ...(streams ?? []).map((st) => ({ value: st.id, label: st.name }))]}
              />
              <SelectField
                id="stream-group"
                label="Sub-stream (optional)"
                size="large"
                helperText={form.stream_id ? undefined : "Choose a stream first to pick a sub-stream."}
                disabled={!form.stream_id}
                value={form.stream_group_id}
                onChange={(v) => set("stream_group_id", v)}
                options={[{ value: "", label: "No sub-stream" }, ...(f.streamGroups ?? []).map((g) => ({ value: g.id, label: g.name }))]}
              />
              <SelectField
                id="medium"
                label={<>Medium (optional) <InfoTip>Classes tied to one medium keep their students together at promotion instead of being reshuffled.</InfoTip></>}
                size="large"
                helperText="Only for single-language classes."
                value={form.medium_id}
                onChange={(v) => set("medium_id", v)}
                options={[{ value: "", label: "No medium" }, ...(mediums ?? []).map((m) => ({ value: m.id, label: m.name }))]}
              />
              <SelectField
                id="home-classroom"
                label="Home classroom (optional)"
                size="large"
                helperText={roomHelp}
                value={f.effectiveHomeClassroomId}
                onChange={(v) => set("home_classroom_id", v)}
                options={[{ value: "", label: "Auto-create to match the class name" }, ...(regularClassrooms ?? []).map((c) => ({ value: c.id, label: c.name }))]}
              />
            </div>
          </Card>
        </Col>
      </Row>

      <div className="os-form-actions">
        <Button size="large" type="primary" icon={<SaveOutlined />} disabled={!f.isValid} loading={f.isSaving} onClick={f.save}>
          {f.isSaving ? "Creating…" : "Create class"}
        </Button>
        <LinkButton to="/classes" size="large">Cancel</LinkButton>
      </div>
    </div>
  );
}
