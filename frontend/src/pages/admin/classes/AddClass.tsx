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
import { AxiosError } from "axios";
import {
  useCreateClass,
  useStreams,
  useStreamGroups,
} from "../../../queries/useClasses";
import { useGrades } from "../../../queries/useGrades";
import { useTeachers } from "../../../queries/useTeachers";
import { useAcademicYears } from "../../../queries/useAcademicYears";

const EMPTY_FORM = {
  grade_id: "",
  // "" means "fall back to the current year" — resolved at render, not stored
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

  // sub-streams belong to a stream, so they can only load once one is chosen
  const { data: streamGroups } = useStreamGroups(form.stream_id);

  // Default to the current academic year by deriving it rather than writing it
  // into state from an effect, so the field is correct on first paint.
  const currentYearId = years?.find((y) => y.is_current)?.id ?? "";
  const academicYearId = form.academic_year_id || currentYearId;

  const set = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // clearing the stream must clear the sub-stream: the classes table has a
  // CHECK that stream_group_id is only set when stream_id is
  const handleStreamChange = (value: string) =>
    setForm((f) => ({ ...f, stream_id: value, stream_group_id: "" }));

  const isValid = form.grade_id && academicYearId && form.name.trim();

  const handleSave = () => {
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
    ? ((createClass.error as AxiosError<{ error: string }>).response?.data
        ?.error ?? "Failed to create class")
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

            <Select
              id="class-teacher"
              labelText="Form Teacher (optional)"
              value={form.form_teacher_id}
              onChange={(e) => set("form_teacher_id", e.target.value)}
            >
              <SelectItem value="" text="Unassigned" />
              {teachers?.map((t) => (
                <SelectItem key={t.id} value={t.id} text={t.full_name} />
              ))}
            </Select>
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

        {!isValid && (
          <InlineNotification
            kind="info"
            title="Required fields"
            subtitle="Grade, class name and academic year are required."
            lowContrast
            hideCloseButton
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
