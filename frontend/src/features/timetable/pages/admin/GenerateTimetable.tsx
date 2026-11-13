// Generates draft timetables for every class in a grade section at once; unsatisfiable periods are reported as gaps.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Tag } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { SkeletonText } from "@/shared/ui/Skeleton";
import SelectField from "@/shared/ui/SelectField";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGradeSections } from "@/features/timetable/queries/useGradeSections";
import { useGenerateTimetables } from "@/features/timetable/queries/useGenerate";
import EmptyState from "@/shared/ui/EmptyState";
import type { ClassGenerationResult } from "@/features/timetable/api/generate";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

// One generated class: placed/required count, a link to the draft, and any periods it could not place.
function ClassResultRow({ result }: { result: ClassGenerationResult }) {
  const complete = result.placed >= result.required && result.required > 0;
  return (
    <div className="os-tt-result">
      <div className="os-flex os-justify-between os-items-center os-gap-3">
        <span className="os-fw-500">{result.class_name}</span>
        <div className="os-flex os-gap-2 os-items-center">
          {result.skipped ? (
            <Tag variant="filled">Skipped</Tag>
          ) : (
            <Tag color={complete ? "success" : result.placed > 0 ? "processing" : undefined} variant="filled">
              {result.placed} / {result.required} periods placed
            </Tag>
          )}
          {result.timetable_id && (
            <Link to={`/timetables/${result.timetable_id}`}><Button size="small">Open draft</Button></Link>
          )}
        </div>
      </div>
      {result.skipped && <p className="os-mt-1 os-mb-0 os-text-sm os-c-tertiary">{result.skip_reason}</p>}
      {result.gaps.length > 0 && (
        <ul className="os-tt-result__gaps">
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

      <div className="os-section">
        <div className="os-section__header">
          <div>
            <h2 className="os-section__title">Generate drafts</h2>
            <p className="os-text-sm os-c-secondary os-m-0">Fills a draft timetable for every class in a grade section. Gaps it cannot place are listed for you to finish by hand.</p>
          </div>
        </div>
        <div className="os-section__body">
          {!currentYear ? (
            <EmptyState title="No current academic year" description="Set an academic year as current first." />
          ) : !gradeSections ? (
            <SkeletonText width="40%" />
          ) : gradeSections.length === 0 ? (
            <EmptyState title="No grade sections yet" description="Create a grade section with a period grid on the Settings tab first." />
          ) : (
            <div className="os-flex os-gap-3 os-items-end os-wrap">
              <div className="os-tt-create">
                <SelectField
                  id="generate-grade-section"
                  label="Grade section"
                  placeholder="Select a grade section…"
                  value={sectionId}
                  onChange={setSectionId}
                  options={gradeSections.map((gs) => ({ value: gs.id, label: gs.name }))}
                />
              </div>
              <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleGenerate} disabled={!sectionId} loading={generate.isPending}>
                {generate.isPending ? "Generating…" : "Generate"}
              </Button>
            </div>
          )}
          <MutationErrorNotification isError={generate.isError} error={generate.error} title="Could not generate timetables" onClose={() => generate.reset()} className="os-mt-4" />
        </div>

        {result && (
          <div className="os-tt-results">
            {result.classes.map((c) => <ClassResultRow key={c.class_id} result={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
