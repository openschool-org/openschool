import { useState } from "react";
import { Add, Calendar, Checkmark, Education } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useSetCurrentAcademicYear,
  useDeleteAcademicYear,
} from "@/features/school/queries/useAcademicYears";
import { useCurrentTerm } from "@/features/school/queries/useTerms";
import type { AcademicYear } from "@/features/school/api/academicYear";
import { isDateRangeInvalid } from "@/shared/lib/date";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import YearsList from "@/features/school/components/academic-years/YearsList";
import CreateYearModal, { type YearForm, type YearFormTouched } from "@/features/school/components/academic-years/CreateYearModal";
import TermsModal from "@/features/school/components/academic-years/TermsModal";
import { isNotFoundError } from "@/shared/api/errors";

const EMPTY_FORM: YearForm = {
  label: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export default function AcademicYears() {
  const { data: years, isLoading, isError, refetch } = useAcademicYears();
  const {
    data: currentTerm,
    isLoading: currentTermLoading,
    isError: currentTermError,
    error: currentTermQueryError,
  } = useCurrentTerm();
  const createYear = useCreateAcademicYear();
  const setCurrent = useSetCurrentAcademicYear();
  const deleteYear = useDeleteAcademicYear();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState<YearFormTouched>({});
  const [toDelete, setToDelete] = useState<AcademicYear | null>(null);
  const [termsFor, setTermsFor] = useState<AcademicYear | null>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setTouched({});
    createYear.reset();
    setCreateOpen(true);
  };

  const dateRangeInvalid = isDateRangeInvalid(form.start_date, form.end_date);
  const currentYear = years?.find((year) => year.is_current);
  const currentYearTitle = isLoading
    ? "Loading academic year…"
    : isError
      ? "Academic year unavailable"
      : currentYear?.label ?? "No current year set";
  const currentTermIsMissing = currentTermError && isNotFoundError(currentTermQueryError);
  const currentTermStatus = currentTerm
    ? `${currentTerm.name} is currently active`
    : currentTermLoading
      ? "Loading current term…"
      : currentTermIsMissing
        ? "No current term set."
        : currentTermError
          ? "Could not load the current term."
          : "Set a current term to enable term-based school workflows.";

  const isValid =
    form.label.trim().length > 0 && !!form.start_date && !!form.end_date && !dateRangeInvalid;

  const handleCreate = () => {
    setTouched({ label: true, start_date: true, end_date: true });
    if (!isValid) return;
    createYear.mutate(
      {
        label: form.label.trim(),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        is_current: form.is_current,
      },
      { onSuccess: () => setCreateOpen(false) },
    );
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteYear.mutate(toDelete.id);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Academic years</h1>
          <p className="os-page__subtitle">
            Manage academic year periods for the school
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          New academic year
        </Button>
      </div>

      <div className="os-current-period os-mb-6">
        <div className="os-current-period__icon"><Calendar size={22} /></div>
        <div className="os-flex-1 os-min-w-0">
          <p className="os-m-0 os-eyebrow">Active academic period</p>
          <h2 className="os-current-period__title">{currentYearTitle}</h2>
          <p className="os-m-0 os-text-sm os-c-secondary">
            {currentTermStatus}
          </p>
        </div>
        {currentTerm ? (
          <Tag type="teal" size="md"><Checkmark size={14} className="os-mr-1" />{currentTerm.name}</Tag>
        ) : currentTermLoading ? (
          <Tag type="cool-gray" size="md">Loading term…</Tag>
        ) : currentTermError && !currentTermIsMissing ? (
          <Tag type="red" size="md">Term unavailable</Tag>
        ) : (
          <Tag type="cool-gray" size="md"><Education size={14} className="os-mr-1" />No current term</Tag>
        )}
      </div>

      <AgentFindingsBanner />

      <YearsList
        years={years}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        setCurrent={setCurrent}
        onOpenTerms={setTermsFor}
        onRequestDelete={setToDelete}
      />

      <CreateYearModal
        open={createOpen}
        form={form}
        setForm={setForm}
        touched={touched}
        setTouched={setTouched}
        dateRangeInvalid={dateRangeInvalid}
        isValid={isValid}
        createYear={createYear}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Delete academic year"
        description={
          <>
            Delete <strong>{toDelete?.label}</strong>? This cannot be undone.
          </>
        }
        subject="Academic year"
        mutation={deleteYear}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />

      {termsFor && <TermsModal year={termsFor} onClose={() => setTermsFor(null)} />}
    </div>
  );
}
