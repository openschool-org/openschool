// Auto-generates draft timetables for every class in a grade section at
// once (teachers/labs are shared across those classes, so they're
// scheduled together) — best-effort fill, with any unsatisfiable periods
// reported as gaps to finish by hand in the timetable editor.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Select, SelectItem, Tag, InlineNotification, SkeletonText } from "@carbon/react";
import { Rocket } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useGradeSections } from "../../../queries/timetable/useGradeSections";
import { useGenerateTimetables } from "../../../queries/timetable/useGenerate";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import type { ClassGenerationResult } from "../../../services/timetable/generate";

function ClassResultCard({ result }: { result: ClassGenerationResult }) {
  if (result.skipped) {
    return (
      <div className="os-section" style={{ padding: "1rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 500 }}>{result.class_name}</span>
          <Tag type="gray" size="sm">
            Skipped
          </Tag>
        </div>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "#8d8d8d" }}>{result.skip_reason}</p>
      </div>
    );
  }

  const complete = result.placed >= result.required && result.required > 0;

  return (
    <div className="os-section" style={{ padding: "1rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 500 }}>{result.class_name}</span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Tag type={complete ? "green" : result.placed > 0 ? "blue" : "gray"} size="sm">
            {result.placed} / {result.required} periods placed
          </Tag>
          {result.timetable_id && (
            <Button kind="ghost" size="sm" as={Link} to={`/timetables/${result.timetable_id}`}>
              Open draft →
            </Button>
          )}
        </div>
      </div>
      {result.gaps.length > 0 && (
        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "#8a6a00" }}>
          {result.gaps.map((g, i) => (
            <li key={i}>
              {g.subject_name || "Unresolved subject"}
              {g.teacher_name ? ` (${g.teacher_name})` : ""} — {g.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function GenerateTimetable() {
  const { data: currentYear } = useCurrentAcademicYear();
  const yearId = currentYear?.id ?? "";
  const { data: gradeSections } = useGradeSections(yearId);
  const [sectionId, setSectionId] = useState("");
  const generate = useGenerateTimetables();

  const handleGenerate = () => {
    if (!yearId || !sectionId) return;
    generate.mutate({ grade_section_id: sectionId, academic_year_id: yearId });
  };

  const result = generate.data;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Generate Timetable</h1>
          <p className="os-page__subtitle">
            Best-effort auto-fills draft timetables for every class in a grade section at once — students keep one
            fixed homeroom, teachers rotate in, and lab-required periods go to a matching lab classroom. Anything it
            can't place is left as a gap for you to finish by hand.
          </p>
        </div>
      </div>

      <div className="os-section" style={{ padding: "1.5rem" }}>
        {!currentYear ? (
          <EmptyState title="No current academic year" description="Set an academic year as current first." />
        ) : !gradeSections ? (
          <SkeletonText width="40%" />
        ) : gradeSections.length === 0 ? (
          <EmptyState
            title="No grade sections yet"
            description="Create a grade section with a period grid under Timetable Settings first."
          />
        ) : (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1rem" }}>
            <div style={{ width: "20rem" }}>
              <Select
                id="generate-grade-section"
                labelText="Grade section"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <SelectItem value="" text="Select a grade section…" />
                {gradeSections.map((gs) => (
                  <SelectItem key={gs.id} value={gs.id} text={gs.name} />
                ))}
              </Select>
            </div>
            <Button renderIcon={Rocket} kind="primary" onClick={handleGenerate} disabled={!sectionId || generate.isPending}>
              {generate.isPending ? "Generating…" : "Generate"}
            </Button>
          </div>
        )}

        {generate.isError && (
          <InlineNotification
            kind="error"
            title="Could not generate timetables"
            subtitle={getErrorMessage(generate.error)}
            lowContrast
            onClose={() => generate.reset()}
            style={{ maxWidth: "100%", marginBottom: "1rem" }}
          />
        )}

        {result && (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {result.classes.map((c) => (
              <ClassResultCard key={c.class_id} result={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
