import { useState } from "react";
import { Alert, Button, Card, Checkbox, Col, Row } from "antd";
import { CalendarOutlined, FilePdfOutlined, TrophyOutlined } from "@ant-design/icons";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { reportExportApi, ATTENDANCE_REPORT_COLUMNS, MARKS_REPORT_COLUMNS } from "@/features/reports/api/reportExport";
import { getErrorMessage } from "@/shared/api/errors";
import { todayISODate } from "@/shared/lib/date";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import DateField from "@/shared/ui/DateField";
import Field from "@/shared/ui/Field";
import SelectField from "@/shared/ui/SelectField";

type Template = "attendance" | "marks";

const TEMPLATES: { key: Template; title: string; description: string; Icon: typeof CalendarOutlined }[] = [
  { key: "attendance", title: "Attendance report", description: "One class over a date range", Icon: CalendarOutlined },
  { key: "marks", title: "Marks report", description: "One subject, one class, one term", Icon: TrophyOutlined },
];

const allValues = (t: Template) => (t === "attendance" ? ATTENDANCE_REPORT_COLUMNS : MARKS_REPORT_COLUMNS).map((c) => c.value);

export default function Reports() {
  const [template, setTemplate] = useState<Template>("attendance");
  const { data: classes } = useCurrentClasses();
  const { data: subjects } = useSubjects();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);

  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState(todayISODate());
  const [to, setTo] = useState(todayISODate());
  const [termId, setTermId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [columns, setColumns] = useState<string[]>(allValues("attendance"));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableColumns = template === "attendance" ? ATTENDANCE_REPORT_COLUMNS : MARKS_REPORT_COLUMNS;
  const active = TEMPLATES.find((t) => t.key === template)!;
  const pickTemplate = (t: Template) => { setTemplate(t); setColumns(allValues(t)); setError(null); };

  const rangeInvalid = template === "attendance" && from > to;
  const isValid = columns.length > 0 && !!classId && (template === "attendance" ? !!from && !!to && !rangeInvalid : !!termId && !!subjectId);
  const className = classes?.find((c) => c.id === classId);
  const summary = !classId
    ? "Choose a class to continue."
    : `${className?.grade_name} ${className?.name} · ${columns.length} of ${availableColumns.length} columns`;

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    // Every column ticked sends no filter, so the server includes them all.
    const cols = columns.length === availableColumns.length ? undefined : columns;
    try {
      if (template === "attendance") await reportExportApi.exportAttendance({ class_id: classId, from, to, columns: cols });
      else await reportExportApi.exportMarks({ class_id: classId, term_id: termId, subject_id: subjectId, columns: cols });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to generate report"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Reports</h1>
          <p className="os-page__subtitle">Export attendance and marks reports as PDF.</p>
        </div>
      </div>

      <Row gutter={[24, 24]} className="os-form-columns">
        <Col xs={24} lg={8}>
          <Card className="os-form-card" title="Choose a report">
            <div className="os-report-types" role="radiogroup" aria-label="Report type">
              {TEMPLATES.map(({ key, title, description, Icon }) => (
                <button key={key} type="button" role="radio" aria-checked={template === key} className={`os-report-type${template === key ? " is-active" : ""}`} onClick={() => pickTemplate(key)}>
                  <span className="os-report-type__icon"><Icon /></span>
                  <span className="os-min-w-0">
                    <span className="os-report-type__title">{title}</span>
                    <span className="os-report-type__desc">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card className="os-form-card os-workflow-setup" title={active.title}>
            <div className="os-stack os-gap-5">
              {error && <Alert type="error" showIcon closable title="Could not generate the report" description={error} onClose={() => setError(null)} />}

              <div className="os-report-grid">
                <EntityCombobox
                  id="report-class"
                  labelText="Class"
                  items={classes ?? []}
                  selectedId={classId}
                  onSelect={setClassId}
                  getId={(c) => c.id}
                  itemToString={(c) => `${c.grade_name} ${c.name}`}
                  placeholder="Search classes…"
                />
                {template === "marks" && (
                  <SelectField id="report-term" label="Term" placeholder="Select term…" value={termId} onChange={setTermId} options={(terms ?? []).map((t) => ({ value: t.id, label: t.name }))} />
                )}
              </div>

              {template === "attendance" ? (
                <div className="os-report-grid">
                  <DateField id="report-from" labelText="From" value={from} onChange={(ymd) => ymd && setFrom(ymd)} />
                  <DateField id="report-to" labelText="To" value={to} onChange={(ymd) => ymd && setTo(ymd)} invalid={rangeInvalid} invalidText="Must be on or after the start date." />
                </div>
              ) : (
                <EntityCombobox id="report-subject" labelText="Subject" items={subjects ?? []} selectedId={subjectId} onSelect={setSubjectId} getId={(s) => s.id} itemToString={(s) => s.name} placeholder="Search subjects…" />
              )}

              <Field id="report-columns" label="Columns" error={columns.length === 0 ? "Pick at least one column." : undefined}>
                <div className="os-report-columns">
                  <Checkbox.Group value={columns} onChange={(v) => setColumns(v as string[])} options={availableColumns.map((c) => ({ value: c.value, label: c.label }))} />
                  <Button type="link" size="small" className="os-p-0" onClick={() => setColumns(columns.length === availableColumns.length ? [] : allValues(template))}>
                    {columns.length === availableColumns.length ? "Clear all" : "Select all"}
                  </Button>
                </div>
              </Field>
            </div>

            <div className="os-workflow-setup__actions os-report-actions">
              <span className="os-text-sm os-c-secondary os-mr-auto">{summary}</span>
              <Button type="primary" icon={<FilePdfOutlined />} onClick={handleExport} disabled={!isValid} loading={exporting}>
                {exporting ? "Generating…" : "Export PDF"}
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
