import { useState } from "react";
import { Select, SelectItem } from "@carbon/react";
import { useMyMarks } from "@/features/students/queries/useStudentSelf";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import TermMarksTable from "@/features/marks/components/TermMarksTable";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import SectionCard from "@/shared/ui/SectionCard";
import { useT } from "@/shared/i18n/useT";

export default function StudentMarks() {
  const { t } = useT();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);
  const [termId, setTermId] = useState("");
  const { data: marks, isLoading } = useMyMarks(termId);

  return (
    <div className="os-p-8">
      <SectionCard title={t("marks.termMarks")}>
        <Select id="my-marks-term" labelText={t("marks.term")} value={termId} onChange={(e) => setTermId(e.target.value)} className="os-max-w-20 os-mb-5">
          <SelectItem value="" text={t("marks.chooseTerm")} />
          {terms?.map((term) => <SelectItem key={term.id} value={term.id} text={term.name} />)}
        </Select>
        {!termId ? (
          <EmptyState title={t("marks.pickTitle")} description={t("marks.pickDesc")} />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : marks?.length ? (
          <TermMarksTable rows={marks} />
        ) : (
          <EmptyState title={t("marks.emptyTitle")} description={t("marks.emptyDesc")} />
        )}
      </SectionCard>
    </div>
  );
}
