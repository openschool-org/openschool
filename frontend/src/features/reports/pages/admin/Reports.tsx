import { useState } from "react";
import { Button, Select, SelectItem, Checkbox, InlineNotification, Tile } from "@carbon/react";
import { DocumentPdf } from "@carbon/icons-react";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { reportExportApi, ATTENDANCE_REPORT_COLUMNS, MARKS_REPORT_COLUMNS } from "@/features/reports/api/reportExport";
import { getErrorMessage } from "@/shared/api/errors";
import { todayISODate } from "@/shared/lib/date";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import DateField from "@/shared/ui/DateField";

type Template = "attendance" | "marks";

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
  const [columns, setColumns] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableColumns = template === "attendance" ? ATTENDANCE_REPORT_COLUMNS : MARKS_REPORT_COLUMNS;

  const toggleColumn = (value: string) =>
    setColumns((cols) => (cols.includes(value) ? cols.filter((c) => c !== value) : [...cols, value]));

  const isValid =
    template === "attendance" ? !!classId && !!from && !!to : !!classId && !!termId && !!subjectId;

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      if (template === "attendance") {
        await reportExportApi.exportAttendance({
          class_id: classId,
          from,
          to,
          columns: columns.length > 0 ? columns : undefined,
        });
      } else {
        await reportExportApi.exportMarks({
          class_id: classId,
          term_id: termId,
          subject_id: subjectId,
          columns: columns.length > 0 ? columns : undefined,
        });
      }
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
          <p className="os-page__subtitle">Export attendance and marks reports to PDF.</p>
        </div>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          lowContrast
          onClose={() => setError(null)} className="os-mb-6 os-max-w-full"
        />
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Report template</h2>
        </div>
        <div className="os-section__body">
          <div className="os-flex os-gap-4 os-mb-6">
            {(["attendance", "marks"] as const).map((t) => (
              <Tile
                key={t}
                onClick={() => { setTemplate(t); setColumns([]); }} className={`os-select-card${template === t ? " is-active" : ""}`}
              >
                <div className="os-flex os-items-center os-gap-2">
                  <DocumentPdf size={18} className="os-fill-accent-dark" />
                  <span className="os-fw-600 os-text-md">
                    {t === "attendance" ? "Attendance report" : "Marks report"}
                  </span>
                </div>
              </Tile>
            ))}
          </div>

          <div className="os-grid os-grid-cols-3 os-gap-4 os-mb-6">
            <Select id="report-class" labelText="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <SelectItem value="" text="Select class…" />
              {classes?.map((c) => (
                <SelectItem key={c.id} value={c.id} text={`${c.grade_name} ${c.name}`} />
              ))}
            </Select>

            {template === "attendance" ? (
              <>
                <DateField value={from} onChange={(ymd) => {
                  if (ymd) setFrom(ymd);
                }} id="report-from" labelText="From" />
                <DateField value={to} onChange={(ymd) => {
                  if (ymd) setTo(ymd);
                }} id="report-to" labelText="To" />
              </>
            ) : (
              <>
                <Select id="report-term" labelText="Term" value={termId} onChange={(e) => setTermId(e.target.value)}>
                  <SelectItem value="" text="Select term…" />
                  {terms?.map((t) => (
                    <SelectItem key={t.id} value={t.id} text={t.name} />
                  ))}
                </Select>
                <EntityCombobox
                  id="report-subject"
                  labelText="Subject"
                  items={subjects ?? []}
                  selectedId={subjectId}
                  onSelect={setSubjectId}
                  getId={(s) => s.id}
                  itemToString={(s) => s.name}
                  placeholder="Search subjects by name…"
                />
              </>
            )}
          </div>

          <div className="os-mb-6">
            <p className="os-text-xs os-fw-600 os-c-secondary os-mb-2">
              Columns (leave all unchecked to include every column)
            </p>
            <div className="os-flex os-gap-6 os-wrap">
              {availableColumns.map((c) => (
                <Checkbox
                  key={c.value}
                  id={`report-col-${c.value}`}
                  labelText={c.label}
                  checked={columns.includes(c.value)}
                  onChange={() => toggleColumn(c.value)}
                />
              ))}
            </div>
          </div>

          <Button renderIcon={DocumentPdf} kind="primary" onClick={handleExport} disabled={!isValid || exporting}>
            {exporting ? "Generating…" : "Export PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
