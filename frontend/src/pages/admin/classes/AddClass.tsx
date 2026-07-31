import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Button,
  Select,
  SelectItem,
  TextInput,
  InlineNotification,
} from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import {
  useCreateClass,
  useStreams,
  useStreamGroups,
} from "../../../queries/useClasses";
import { useGrades } from "../../../queries/useGrades";
import { useTeachers } from "../../../queries/useTeachers";
import { useAcademicYears } from "../../../queries/useAcademicYears";
import { getErrorMessage } from "../../../lib/errorMessage";
import EntityCombobox from "../../../components/common/EntityCombobox";

type Touched = Partial<Record<"grade" | "name" | "year", boolean>>;

const EMPTY_FORM = {
  grade_id: "",
  academic_year_id: "",
  name: "",
  stream_id: "",
  stream_group_id: "",
  form_teacher_id: "",
};

export default function AddClass() {
  const navigate = useNavigate();

  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: years } = useAcademicYears();
  const { data: streams } = useStreams();
  const { data: teachers } = useTeachers();
  const createClass = useCreateClass();

  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState<Touched>({});

  const markTouched = (field: keyof Touched) => setTouched((t) => ({ ...t, [field]: true }));

  const { data: streamGroups } = useStreamGroups(form.stream_id);

  const currentYearId = years?.find((y) => y.is_current)?.id ?? "";
  const academicYearId = form.academic_year_id || currentYearId;

  const set = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleStreamChange = (value: string) =>
    setForm((f) => ({ ...f, stream_id: value, stream_group_id: "" }));

  const gradeInvalid = !!touched.grade && !form.grade_id;
  const nameInvalid = !!touched.name && !form.name.trim();
  const yearInvalid = !!touched.year && !academicYearId;

  const isValid = form.grade_id && academicYearId && form.name.trim();

  const handleSave = () => {
    setTouched({ grade: true, name: true, year: true });
    if (!isValid) return;
    createClass.mutate(
      {
        grade_id: form.grade_id,
        academic_year_id: academicYearId,
        name: form.name.trim(),
        stream_id: form.stream_id || null,
        stream_group_id: form.stream_group_id || null,
        form_teacher_id: form.form_teacher_id || null,
      },
      { onSuccess: () => navigate("/classes") },
    );
  };

  const error = createClass.isError
    ? getErrorMessage(createClass.error, "Failed to create class")
    : null;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <div className="os-page__breadcrumb">
            <Link to="/classes">Classes</Link>
            <span>/</span>
            <span>Add Class</span>
          </div>
          <h1 className="os-page__title">Add New Class</h1>
          <p className="os-page__subtitle">
            Create a class for an academic year
          </p>
        </div>
        <Button
          renderIcon={ArrowLeft}
          kind="ghost"
          size="md"
          as={Link}
          to="/classes"
        >
          Back
        </Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Class Details</div>
          <div className="os-form__section-body">
            <Select
              id="grade"
              labelText="Grade"
              value={form.grade_id}
              onChange={(e) => set("grade_id", e.target.value)}
              onBlur={() => markTouched("grade")}
              invalid={gradeInvalid}
              invalidText="A grade is required."
            >
              <SelectItem
                value=""
                text={gradesLoading ? "Loading grades…" : "Select grade…"}
              />
              {grades?.map((g) => (
                <SelectItem key={g.id} value={g.id} text={g.name} />
              ))}
            </Select>

            <TextInput
              id="class-name"
              labelText="Class Name"
              placeholder="e.g. 10-A"
              maxLength={20}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => markTouched("name")}
              invalid={nameInvalid}
              invalidText="A class name is required."
            />

            <Select
              id="stream"
              labelText="Stream (optional)"
              value={form.stream_id}
              onChange={(e) => handleStreamChange(e.target.value)}
            >
              <SelectItem value="" text="No stream" />
              {streams?.map((s) => (
                <SelectItem key={s.id} value={s.id} text={s.name} />
              ))}
            </Select>

            <Select
              id="stream-group"
              labelText="Sub-stream (optional)"
              helperText={
                form.stream_id
                  ? undefined
                  : "Choose a stream first to pick a sub-stream."
              }
              disabled={!form.stream_id}
              value={form.stream_group_id}
              onChange={(e) => set("stream_group_id", e.target.value)}
            >
              <SelectItem value="" text="No sub-stream" />
              {streamGroups?.map((g) => (
                <SelectItem key={g.id} value={g.id} text={g.name} />
              ))}
            </Select>

            <EntityCombobox
              id="class-teacher"
              labelText="Form Teacher (optional)"
              items={teachers ?? []}
              selectedId={form.form_teacher_id}
              onSelect={(id) => set("form_teacher_id", id)}
              getId={(t) => t.id}
              itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
              placeholder="Search teachers by name or employee number…"
            />
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Academic Year</div>
          <div className="os-form__section-body">
            <Select
              id="academic-year"
              labelText="Academic Year"
              value={academicYearId}
              onChange={(e) => set("academic_year_id", e.target.value)}
              onBlur={() => markTouched("year")}
              invalid={yearInvalid}
              invalidText="An academic year is required."
            >
              <SelectItem value="" text="Select academic year…" />
              {years?.map((y) => (
                <SelectItem
                  key={y.id}
                  value={y.id}
                  text={y.is_current ? `${y.label} (Current)` : y.label}
                />
              ))}
            </Select>
            <div />
          </div>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Could not create class"
            subtitle={error}
            lowContrast
            onClose={() => createClass.reset()}
            style={{ maxWidth: "100%" }}
          />
        )}

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            disabled={!isValid || createClass.isPending}
            onClick={handleSave}
          >
            {createClass.isPending ? "Creating…" : "Create Class"}
          </Button>
          <Button kind="secondary" as={Link} to="/classes">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
