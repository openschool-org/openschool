import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, TextInput, Checkbox, InlineNotification } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";

const GRADES = [
  "Grade 6", "Grade 7", "Grade 8", "Grade 9",
  "Grade 10", "Grade 11", "Grade 12", "Grade 13",
];

const CODE_HINTS = [
  { prefix: "GEN-",   example: "GEN-M01",  label: "Grades 6–9 (General)" },
  { prefix: "OL-M",   example: "OL-M04",   label: "Grades 10–11 Compulsory" },
  { prefix: "OL-B1-", example: "OL-B1-01", label: "Grades 10–11 Basket 1" },
  { prefix: "OL-B2-", example: "OL-B2-01", label: "Grades 10–11 Basket 2" },
  { prefix: "OL-B3-", example: "OL-B3-01", label: "Grades 10–11 Basket 3" },
  { prefix: "AL-",    example: "AL-01",     label: "Grades 12–13 (A/L)" },
];

export default function AddSubject() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  function toggleGrade(grade: string) {
    setSelectedGrades(prev =>
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    );
  }

  function detectedLevel(): string {
    if (code.startsWith("GEN-")) return "Grades 6–9";
    if (code.startsWith("OL-")) return "Grades 10–11";
    if (code.startsWith("AL-")) return "Grades 12–13";
    return "";
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <div className="os-page__breadcrumb">
            <Link to="/subjects">Subjects</Link>
            <span>/</span>
            <span>Add Subject</span>
          </div>
          <h1 className="os-page__title">Add New Subject</h1>
          <p className="os-page__subtitle">Define a subject and assign it to grades</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/subjects">Back</Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Subject Information</div>
          <div className="os-form__section-body">
            <TextInput
              id="subject-name"
              labelText="Subject Name"
              placeholder="e.g. Mathematics"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <div>
              <TextInput
                id="subject-code"
                labelText="Subject Code"
                placeholder="e.g. GEN-M01"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                helperText={detectedLevel() ? `Level detected: ${detectedLevel()}` : "Use prefix: GEN- / OL-M / OL-B1- / OL-B2- / OL-B3- / AL-"}
              />
            </div>

            <div className="os-form__full-col">
              <p style={{ fontSize: "0.75rem", color: "#525252", marginBottom: "0.5rem" }}>
                Code prefix convention
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {CODE_HINTS.map(h => (
                  <span
                    key={h.prefix}
                    style={{ padding: "0.25rem 0.5rem", background: "#e0e0e0", borderRadius: "2px", fontSize: "0.75rem", fontFamily: "monospace" }}
                  >
                    <strong>{h.example}</strong> — {h.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Grade Assignment</div>
          <div className="os-form__section-body">
            <div className="os-form__full-col">
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#161616", marginBottom: "0.75rem" }}>
                Applicable to grades
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
                {GRADES.map(g => (
                  <Checkbox
                    key={g}
                    id={`grade-${g}`}
                    labelText={g}
                    checked={selectedGrades.includes(g)}
                    onChange={() => toggleGrade(g)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {(!name || !code) && (
          <InlineNotification
            kind="info"
            title="Required fields"
            subtitle="Subject name and code are required to save."
            lowContrast
            hideCloseButton
          />
        )}

        <div className="os-form__actions">
          <Button renderIcon={Save} kind="primary" disabled={!name || !code} onClick={() => navigate("/subjects")}>
            Save Subject
          </Button>
          <Button kind="secondary" as={Link} to="/subjects">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
