import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Checkmark, WarningAlt } from "@carbon/icons-react";
import {
  Button,
  Tag,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import { useClass } from "../../../queries/useClasses";
import { useGrades } from "../../../queries/useGrades";
import { useTeachers } from "../../../queries/useTeachers";
import { useSubjects } from "../../../queries/useSubjects";
import { useClassrooms } from "../../../queries/timetable/useClassrooms";
import { useGradeSections, useGradeSectionPeriods } from "../../../queries/timetable/useGradeSections";
import {
  useTimetable,
  useTimetableEntries,
  useSaveTimetableEntries,
  useDeleteTimetableEntry,
  useTimetableValidation,
  useTimetableStatusHistory,
  useSubmitTimetable,
  usePublishTimetable,
} from "../../../queries/timetable/useTimetables";
import type { TimetableEntry } from "../../../services/timetable/timetable";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import EntityCombobox from "../../../components/common/EntityCombobox";

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export default function TimetableEditor() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: timetable, isLoading: ttLoading } = useTimetable(id);
  const { data: entries } = useTimetableEntries(id);
  const { data: cls } = useClass(timetable?.class_id ?? "");
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const { data: subjects } = useSubjects();
  const { data: classrooms } = useClassrooms();
  const { data: gradeSections } = useGradeSections(timetable?.academic_year_id ?? "");

  const gradeSection = useMemo(
    () => gradeSections?.find((gs) => cls && gs.grade_ids.includes(cls.grade_id)),
    [gradeSections, cls],
  );
  const { data: periods } = useGradeSectionPeriods(gradeSection?.id ?? "");

  const saveEntries = useSaveTimetableEntries(id);
  const deleteEntry = useDeleteTimetableEntry(id);
  const submit = useSubmitTimetable(id);
  const publish = usePublishTimetable(id);

  const [validationOpen, setValidationOpen] = useState(false);
  const { data: validation, refetch: runValidation, isFetching: validating } = useTimetableValidation(id);
  const { data: history } = useTimetableStatusHistory(id);

  const [cell, setCell] = useState<{ day: number; period: number } | null>(null);
  const [cellForm, setCellForm] = useState<{ subjectId: string; teacherId: string; classroomId: string }>({
    subjectId: "",
    teacherId: "",
    classroomId: "",
  });

  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name ?? "";
  const isDraft = timetable?.status === "draft";

  const entryAt = (day: number, period: number): TimetableEntry | undefined =>
    entries?.find((e) => e.day_of_week === day && e.period_number === period);

  const openCell = (day: number, period: number) => {
    if (!isDraft) return;
    const existing = entryAt(day, period);
    setCellForm({
      subjectId: existing?.subject_id ?? "",
      teacherId: existing?.teacher_id ?? "",
      classroomId: existing?.classroom_id ?? "",
    });
    setCell({ day, period });
  };

  const handleSaveCell = () => {
    if (!cell) return;
    saveEntries.mutate(
      [
        {
          day_of_week: cell.day,
          period_number: cell.period,
          subject_id: cellForm.subjectId || null,
          teacher_id: cellForm.teacherId || null,
          classroom_id: cellForm.classroomId || null,
        },
      ],
      { onSuccess: () => setCell(null) },
    );
  };

  const handleClearCell = () => {
    if (!cell) return;
    deleteEntry.mutate({ day: cell.day, period: cell.period }, { onSuccess: () => setCell(null) });
  };

  const handleValidate = () => {
    setValidationOpen(true);
    runValidation();
  };

  const handleSubmit = () => {
    submit.mutate();
  };

  const handlePublish = () => {
    publish.mutate();
  };

  if (ttLoading || !timetable) {
    return (
      <div className="os-page">
        <SkeletonText width="30%" />
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">
            {gradeName} - {cls?.name} <Tag type="gray" size="sm">v{timetable.version}</Tag>
          </h1>
          <p className="os-page__subtitle">
            Status: <strong>{STATUS_LABEL[timetable.status] ?? timetable.status}</strong>
            {timetable.review_comments && (
              <>
                {" "}— <em>{timetable.review_comments}</em>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button kind="tertiary" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button kind="ghost" onClick={handleValidate} disabled={validating}>
            {validating ? "Validating…" : "Validate"}
          </Button>
          {isDraft && (
            <Button kind="primary" onClick={handleSubmit} disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit for Review"}
            </Button>
          )}
          {timetable.status === "approved" && (
            <Button kind="primary" onClick={handlePublish} disabled={publish.isPending}>
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {submit.isError && (
        <InlineNotification
          kind="error"
          title="Could not submit"
          subtitle={getErrorMessage(submit.error, "Fix the validation issues shown by Validate, then try again.")}
          lowContrast
          onClose={() => submit.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}
      {publish.isError && (
        <InlineNotification
          kind="error"
          title="Could not publish"
          subtitle={getErrorMessage(publish.error)}
          lowContrast
          onClose={() => publish.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}

      <div className="os-section" style={{ overflowX: "auto" }}>
        {!gradeSection ? (
          <EmptyState
            title="No grade section configured"
            description="Assign this class's grade to a Grade Section (with a period grid) before building the timetable."
          />
        ) : !periods || periods.length === 0 ? (
          <EmptyState
            title="No periods configured"
            description="Open Grade Sections and generate/configure the period grid for this section."
          />
        ) : (
          <table className="os-table" style={{ minWidth: "50rem" }}>
            <thead>
              <tr>
                <th style={{ width: "8rem" }}>Time</th>
                {DAYS.map((d) => (
                  <th key={d.value}>{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p) =>
                p.slot_type === "interval" ? (
                  <tr key={p.id}>
                    <td colSpan={DAYS.length + 1} style={{ background: "#fff8e1", textAlign: "center", fontWeight: 600 }}>
                      Interval {p.start_time}–{p.end_time}
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>P{p.period_number}</div>
                      <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
                        {p.start_time}–{p.end_time}
                      </div>
                    </td>
                    {DAYS.map((d) => {
                      const e = entryAt(d.value, p.period_number!);
                      return (
                        <td
                          key={d.value}
                          onClick={() => openCell(d.value, p.period_number!)}
                          style={{ cursor: isDraft ? "pointer" : "default", minWidth: "8rem", verticalAlign: "top" }}
                        >
                          {e?.subject_name ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{e.subject_name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#525252" }}>{e.teacher_name}</div>
                              {e.classroom_name && (
                                <div style={{ fontSize: "0.7rem", color: "#8d8d8d" }}>{e.classroom_name}</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#c6c6c6" }}>{isDraft ? "+ Add" : ""}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>

      {history && history.length > 0 && (
        <div className="os-section" style={{ padding: "1rem 1.5rem" }}>
          <h2 className="os-section__title" style={{ marginBottom: "0.75rem" }}>
            Status History
          </h2>
          {history.map((h) => (
            <div key={h.id} style={{ fontSize: "0.8rem", color: "#525252", marginBottom: "0.375rem" }}>
              <strong>{STATUS_LABEL[h.to_status] ?? h.to_status}</strong> by {h.changed_by_name} on{" "}
              {new Date(h.changed_at).toLocaleString()}
              {h.comment && <> — {h.comment}</>}
            </div>
          ))}
        </div>
      )}

      {/* Cell editor */}
      <ComposedModal open={!!cell} size="sm" onClose={() => setCell(null)}>
        <ModalHeader title={cell ? `${DAYS.find((d) => d.value === cell.day)?.label} — Period ${cell.period}` : ""} />
        <ModalBody>
          {saveEntries.isError && (
            <InlineNotification
              kind="error"
              title="Could not save"
              subtitle={getErrorMessage(saveEntries.error)}
              lowContrast
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <div style={{ display: "grid", gap: "1rem" }}>
            <EntityCombobox
              id="cell-subject"
              items={subjects ?? []}
              selectedId={cellForm.subjectId}
              onSelect={(sid) => setCellForm((f) => ({ ...f, subjectId: sid }))}
              getId={(s) => s.id}
              itemToString={(s) => s.name}
              labelText="Subject"
              placeholder="Search subjects…"
            />
            <EntityCombobox
              id="cell-teacher"
              items={teachers ?? []}
              selectedId={cellForm.teacherId}
              onSelect={(tid) => setCellForm((f) => ({ ...f, teacherId: tid }))}
              getId={(t) => t.id}
              itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
              labelText="Teacher"
              placeholder="Search teachers…"
            />
            <EntityCombobox
              id="cell-classroom"
              items={classrooms ?? []}
              selectedId={cellForm.classroomId}
              onSelect={(cid) => setCellForm((f) => ({ ...f, classroomId: cid }))}
              getId={(c) => c.id}
              itemToString={(c) => c.name}
              labelText="Classroom (optional)"
              placeholder="Search classrooms…"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="danger--ghost" onClick={handleClearCell} disabled={deleteEntry.isPending}>
            Clear
          </Button>
          <Button kind="secondary" onClick={() => setCell(null)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSaveCell} disabled={saveEntries.isPending}>
            {saveEntries.isPending ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      {/* Validation results */}
      <ComposedModal open={validationOpen} size="md" onClose={() => setValidationOpen(false)}>
        <ModalHeader title="Validation results" />
        <ModalBody>
          {validating ? (
            <SkeletonText width="60%" />
          ) : !validation || validation.issues.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#24a148" }}>
              <Checkmark size={20} />
              <span>No issues found. This timetable is ready to submit.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {validation.issues.map((issue, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    background: issue.severity === "error" ? "#fff1f1" : "#fff8e1",
                  }}
                >
                  <WarningAlt size={16} style={{ fill: issue.severity === "error" ? "#da1e28" : "#f1c21b", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.875rem" }}>
                    {issue.day_of_week != null && (
                      <strong>
                        {DAYS.find((d) => d.value === issue.day_of_week)?.label} P{issue.period_number}:{" "}
                      </strong>
                    )}
                    {issue.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setValidationOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
