import { useState } from "react";
import { useMyMarks } from "@/features/students/queries/useStudentSelf";
import TermMarksPanel from "@/features/marks/components/TermMarksPanel";
import SectionCard from "@/shared/ui/SectionCard";
import { useT } from "@/shared/i18n/useT";

export default function StudentMarks() {
  const { t } = useT();
  const [termId, setTermId] = useState("");
  const { data: marks, isLoading } = useMyMarks(termId);

  return (
    <div className="os-p-8">
      <SectionCard title={t("marks.termMarks")}>
        <TermMarksPanel id="my-marks-term" termId={termId} onTermChange={setTermId} marks={marks} isLoading={isLoading} />
      </SectionCard>
    </div>
  );
}
