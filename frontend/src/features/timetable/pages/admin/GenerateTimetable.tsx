// Generates draft timetables for every class in a grade section at once; unsatisfiable periods are reported as gaps.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Select, SelectItem, Tag, SkeletonText } from "@carbon/react";
import { Rocket } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGradeSections } from "@/features/timetable/queries/useGradeSections";
import { useGenerateTimetables } from "@/features/timetable/queries/useGenerate";
import EmptyState from "@/shared/ui/EmptyState";
import type { ClassGenerationResult } from "@/features/timetable/api/generate";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

function ClassResultCard({ result }: { result: ClassGenerationResult }) {
  if (result.skipped) {
    return (
      <div className="os-section os-py-4 os-px-6">
        <div className="os-flex os-justify-between os-items-center">
          <span className="os-fw-500">{result.class_name}</span>
          <Tag type="gray" size="sm">
            Skipped
          </Tag>
        </div>
        <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-tertiary">{result.skip_reason}</p>
      </div>
    );
  }

  const complete = result.placed >= result.required && result.required > 0;

  return (
    <div className="os-section os-py-4 os-px-6">
      <div className="os-flex os-justify-between os-items-center">
        <span className="os-fw-500">{result.class_name}</span>
        <div className="os-flex os-gap-2 os-items-center">
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
        <ul className="os-mt-2 os-mx-0 os-mb-0 os-pl-5 os-text-sm os-c-warning-text">
          {result.gaps.map((g, i) => (
            <li key={i}>
              {g.subject_name || "Unresolved subject"}
              {g.teacher_name ? ` (${g.teacher_name})` : ""} - {g.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function GenerateTimetable({ inline = false }: { inline?: boolean }) {
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
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Generate timetable</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Fill draft timetables for every class in a grade section at once.
              <InfoTip>Students stay in their homeroom, teachers move, and lab periods go to a matching lab. Anything it cannot place is left for you to finish by hand.</InfoTip>
            </div>
          </div>
        </div>
      )}

      <div className="os-section os-p-6">
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
          <div className="os-flex os-gap-3 os-items-end os-mb-4">
            <div className="os-w-20">
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

        <MutationErrorNotification
          isError={generate.isError}
          error={generate.error}
          title="Could not generate timetables"
          onClose={() => generate.reset()} className="os-mb-4"
        />

        {result && (
          <div className="os-grid os-gap-3 os-mt-4">
            {result.classes.map((c) => (
              <ClassResultCard key={c.class_id} result={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
