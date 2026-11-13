import { useState } from "react";
import SelectField from "@/shared/ui/SelectField";
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
        <SelectField
          id="my-marks-term"
          label={t("marks.term")}
          className="os-max-w-20 os-mb-5"
          placeholder={t("marks.chooseTerm")}
          value={termId}
          onChange={setTermId}
          options={(terms ?? []).map((term) => ({ value: term.id, label: term.name }))}
        />
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
