import { useState } from "react";
import { Button, Select, SelectItem, Checkbox, DatePicker, DatePickerInput, InlineNotification, Tile } from "@carbon/react";
import { DocumentPdf } from "@carbon/icons-react";
import { useCurrentClasses } from "../../../queries/useClasses";
import { useSubjects } from "../../../queries/useSubjects";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useTerms } from "../../../queries/useTerms";
import { reportExportApi, ATTENDANCE_REPORT_COLUMNS, MARKS_REPORT_COLUMNS } from "../../../services/reportExport";
import { getErrorMessage } from "../../../lib/errorMessage";
import { todayISODate, toYmd } from "../../../lib/date";
import EntityCombobox from "../../../components/common/EntityCombobox";

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
          onClose={() => setError(null)}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Report Template</h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            {(["attendance", "marks"] as const).map((t) => (
              <Tile
                key={t}
                onClick={() => { setTemplate(t); setColumns([]); }}
                style={{
                  cursor: "pointer",
                  padding: "1rem 1.5rem",
                  border: `1px solid ${template === t ? "#406AAF" : "#e0e0e0"}`,
                  background: template === t ? "#edf5ff" : "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <DocumentPdf size={18} style={{ fill: "#406AAF" }} />
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {t === "attendance" ? "Attendance Report" : "Marks Report"}
                  </span>
                </div>
              </Tile>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <Select id="report-class" labelText="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <SelectItem value="" text="Select class…" />
              {classes?.map((c) => (
                <SelectItem key={c.id} value={c.id} text={`${c.grade_name} ${c.name}`} />
              ))}
            </Select>

            {template === "attendance" ? (
              <>
                <DatePicker datePickerType="single" dateFormat="Y-m-d" value={from} onChange={(dates) => {
                  const ymd = toYmd(dates[0]);
                  if (ymd) setFrom(ymd);
                }}>
                  <DatePickerInput id="report-from" labelText="From" placeholder="YYYY-MM-DD" />
                </DatePicker>
                <DatePicker datePickerType="single" dateFormat="Y-m-d" value={to} onChange={(dates) => {
                  const ymd = toYmd(dates[0]);
                  if (ymd) setTo(ymd);
                }}>
                  <DatePickerInput id="report-to" labelText="To" placeholder="YYYY-MM-DD" />
                </DatePicker>
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

          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#525252", marginBottom: "0.5rem" }}>
              Columns (leave all unchecked to include every column)
            </p>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
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
