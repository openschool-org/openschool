// This file renders the StudentMarks page, allowing students to check their exam and term marks across academic terms.

import { useState } from "react";
import { Select, SelectItem } from "@carbon/react";
import { useMyMarks } from "../../queries/useStudentSelf";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useTerms } from "../../queries/useTerms";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

export default function StudentMarks() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const [termId, setTermId] = useState("");
  const { data: marks, isLoading } = useMyMarks(termId);

  return (
    <div style={{ padding: "2rem" }}>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Term Marks</h2>
        </div>
        <div className="os-section__body">
          <Select
            id="my-marks-term"
            labelText="Term"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            style={{ maxWidth: "20rem", marginBottom: "1.25rem" }}
          >
            <SelectItem value="" text="Choose a term…" />
            {terms?.map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.name} />
            ))}
          </Select>

          {!termId ? (
            <EmptyState title="Pick a term" description="Choose a term to see your marks for it." />
          ) : isLoading ? (
            <LoadingSpinner />
          ) : marks && marks.length > 0 ? (
            <table className="os-table os-table--no-hover">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th style={{ textAlign: "right" }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.subject_name}{" "}
                      <span className="os-table__muted">({m.subject_code})</span>
                    </td>
                    <td className="os-table__muted">{m.teacher_name || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {m.marks} / {m.max_marks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No marks yet" description="Marks for this term haven't been recorded yet." />
          )}
        </div>
      </div>
    </div>
  );
}
