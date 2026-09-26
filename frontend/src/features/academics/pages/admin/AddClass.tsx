import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, Select, SelectItem, TextInput, InlineNotification } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useStreams } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useCreateClassForm } from "@/features/academics/hooks/useCreateClassForm";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import InfoTip from "@/shared/ui/InfoTip";

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
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/classes">Back</Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Class details</div>
          <div className="os-form__section-body">
            <Select id="grade" labelText="Grade" value={form.grade_id} onChange={(e) => set("grade_id", e.target.value)} onBlur={() => f.markTouched("grade")} invalid={!!touched.grade && !form.grade_id} invalidText="A grade is required.">
              <SelectItem value="" text={gradesLoading ? "Loading grades…" : "Select grade…"} />
              {grades?.map((g) => <SelectItem key={g.id} value={g.id} text={g.name} />)}
            </Select>
            <TextInput id="class-name" labelText="Class name" placeholder="e.g. 10-A" maxLength={20} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => f.markTouched("name")} invalid={!!touched.name && !form.name.trim()} invalidText="A class name is required." />
            <Select id="stream" labelText="Stream (optional)" value={form.stream_id} onChange={(e) => set("stream_id", e.target.value)}>
              <SelectItem value="" text="No stream" />
              {streams?.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
            </Select>
            <Select id="stream-group" labelText="Sub-stream (optional)" helperText={form.stream_id ? undefined : "Choose a stream first to pick a sub-stream."} disabled={!form.stream_id} value={form.stream_group_id} onChange={(e) => set("stream_group_id", e.target.value)}>
              <SelectItem value="" text="No sub-stream" />
              {f.streamGroups?.map((g) => <SelectItem key={g.id} value={g.id} text={g.name} />)}
            </Select>
            <Select id="medium" labelText={<>Medium (optional) <InfoTip>Classes tied to one medium keep their students together at promotion instead of being reshuffled.</InfoTip></>} helperText="Only for single-language classes." value={form.medium_id} onChange={(e) => set("medium_id", e.target.value)}>
              <SelectItem value="" text="No medium" />
              {mediums?.map((m) => <SelectItem key={m.id} value={m.id} text={m.name} />)}
            </Select>
            <Select id="home-classroom" labelText="Home classroom (optional)" helperText={roomHelp} value={f.effectiveHomeClassroomId} onChange={(e) => set("home_classroom_id", e.target.value)}>
              <SelectItem value="" text="Auto-create to match the class name" />
              {regularClassrooms?.map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
            </Select>
            <EntityCombobox
              id="class-teacher"
              labelText="Form teacher (optional)"
              items={teachers ?? []}
              selectedId={form.form_teacher_id}
              onSelect={(id) => set("form_teacher_id", id)}
              onSearch={setTeacherSearch}
              getId={(t) => t.id}
              itemToString={(t) => `${t.full_name} - ${t.employee_number}`}
              placeholder="Search teachers by name or employee number…"
            />
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Academic year</div>
          <div className="os-form__section-body">
            <Select id="academic-year" labelText="Academic year" value={f.academicYearId} onChange={(e) => set("academic_year_id", e.target.value)} onBlur={() => f.markTouched("year")} invalid={!!touched.year && !f.academicYearId} invalidText="An academic year is required.">
              <SelectItem value="" text="Select academic year…" />
              {f.years?.map((y) => <SelectItem key={y.id} value={y.id} text={y.is_current ? `${y.label} (Current)` : y.label} />)}
            </Select>
            <div />
          </div>
        </div>

        {f.error && <InlineNotification kind="error" title="Could not create class" subtitle={f.error} lowContrast onClose={f.clearError} className="os-max-w-full" />}

        <div className="os-form__actions">
          <Button renderIcon={Save} kind="primary" disabled={!f.isValid || f.isSaving} onClick={f.save}>
            {f.isSaving ? "Creating…" : "Create class"}
          </Button>
          <Button kind="secondary" as={Link} to="/classes">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
