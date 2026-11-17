import SelectField from "@/shared/ui/SelectField";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import EmptyState from "@/shared/ui/EmptyState";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import TermMarksTable, { type TermMarkRow } from "@/features/marks/components/TermMarksTable";
import { useT } from "@/shared/i18n/useT";

interface Props {
  id: string;
  termId: string;
  onTermChange: (termId: string) => void;
  marks: TermMarkRow[] | undefined;
  isLoading: boolean;
}

// Term picker plus that term's marks. The caller owns the marks query, so it works for a student or a parent.
export default function TermMarksPanel({ id, termId, onTermChange, marks, isLoading }: Props) {
  const { t } = useT();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: terms } = useTerms(currentYear?.id);

  return (
    <>
      <SelectField
        id={id}
        label={t("marks.term")}
        className="os-max-w-20 os-mb-5"
        placeholder={t("marks.chooseTerm")}
        value={termId}
        onChange={onTermChange}
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
    </>
  );
}
