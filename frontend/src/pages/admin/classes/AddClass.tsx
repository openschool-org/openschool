// This file renders the Add Class form page: picks grade, name, stream/sub-
// stream, medium and form teacher, then creates the class for an academic
// year. Supports preselecting the grade via a `?grade_id=` query param.

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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
import { useMediums } from "../../../queries/useCurriculum";
import { useClassrooms, useCreateClassroom } from "../../../queries/timetable/useClassrooms";
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
  medium_id: "",
  home_classroom_id: "",
};

export default function AddClass() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedGradeId = searchParams.get("grade_id") ?? "";

  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: years } = useAcademicYears();
  const { data: streams } = useStreams();
  const { data: mediums } = useMediums();
  const { data: classrooms } = useClassrooms();
  const { data: teachers } = useTeachers();
  const regularClassrooms = classrooms?.filter((c) => c.room_type === "regular");
  const createClass = useCreateClass();
  const createClassroom = useCreateClassroom();

  const [form, setForm] = useState({ ...EMPTY_FORM, grade_id: preselectedGradeId });
  const [touched, setTouched] = useState<Touched>({});
  const [roomError, setRoomError] = useState<string | null>(null);

  const markTouched = (field: keyof Touched) => setTouched((t) => ({ ...t, [field]: true }));

  // Sri Lankan schools usually name a class's homeroom the same as the
  // class itself (e.g. class "13-M1" sits in room "13-M1") — suggest that
  // match automatically, but let the admin override it.
  const suggestedHomeClassroom = form.name.trim()
    ? regularClassrooms?.find((c) => c.name.trim().toLowerCase() === form.name.trim().toLowerCase())
    : undefined;
  const effectiveHomeClassroomId = form.home_classroom_id || suggestedHomeClassroom?.id || "";

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

  const handleSave = async () => {
    setTouched({ grade: true, name: true, year: true });
    if (!isValid) return;
    setRoomError(null);

    // No room picked and no name match found — automatically create one
    // named after the class itself (the common Sri Lankan case: a class's
    // homeroom is just called the same thing as the class, e.g. "13-M1").
    let homeClassroomId = effectiveHomeClassroomId;
    if (!homeClassroomId) {
      try {
        const created = await createClassroom.mutateAsync({ name: form.name.trim(), room_type: "regular" });
        homeClassroomId = created.id;
      } catch (e) {
        setRoomError(getErrorMessage(e, "Failed to create this class's home classroom"));
        return;
      }
    }

    createClass.mutate(
      {
        grade_id: form.grade_id,
        academic_year_id: academicYearId,
        name: form.name.trim(),
        stream_id: form.stream_id || null,
        stream_group_id: form.stream_group_id || null,
        form_teacher_id: form.form_teacher_id || null,
        medium_id: form.medium_id || null,
        home_classroom_id: homeClassroomId || null,
      },
      { onSuccess: () => navigate("/classes") },
    );
  };

  const error =
    roomError ?? (createClass.isError ? getErrorMessage(createClass.error, "Failed to create class") : null);
  const isSaving = createClassroom.isPending || createClass.isPending;

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

            <Select
              id="medium"
              labelText="Medium (optional)"
              helperText="Set this only if the section is reserved for one language of instruction — medium-designated classes carry students straight over at promotion instead of being reshuffled."
              value={form.medium_id}
              onChange={(e) => set("medium_id", e.target.value)}
            >
              <SelectItem value="" text="No medium" />
              {mediums?.map((m) => (
                <SelectItem key={m.id} value={m.id} text={m.name} />
              ))}
            </Select>

            <Select
              id="home-classroom"
              labelText="Home Classroom (optional)"
              helperText={
                !form.home_classroom_id && suggestedHomeClassroom
                  ? "Auto-suggested from the class name — pick a different room to override."
                  : !form.home_classroom_id && form.name.trim()
                    ? `Left as-is, a new room named "${form.name.trim()}" will be created automatically as this class's homeroom.`
                    : "Students stay in this room all day; teachers rotate in."
              }
              value={effectiveHomeClassroomId}
              onChange={(e) => set("home_classroom_id", e.target.value)}
            >
              <SelectItem value="" text="Auto-create to match the class name" />
              {regularClassrooms?.map((c) => (
                <SelectItem key={c.id} value={c.id} text={c.name} />
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
            onClose={() => {
              setRoomError(null);
              createClass.reset();
            }}
            style={{ maxWidth: "100%" }}
          />
        )}

        <div className="os-form__actions">
          <Button
            renderIcon={Save}
            kind="primary"
            disabled={!isValid || isSaving}
            onClick={handleSave}
          >
            {isSaving ? "Creating…" : "Create Class"}
          </Button>
          <Button kind="secondary" as={Link} to="/classes">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
