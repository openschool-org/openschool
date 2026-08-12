import { useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import {
  useAcademicYears,
  useCreateAcademicYear,
  useSetCurrentAcademicYear,
  useDeleteAcademicYear,
} from "../../../queries/useAcademicYears";
import type { AcademicYear } from "../../../services/academicYear";
import ConfirmDeleteModal from "../../../components/common/ConfirmDeleteModal";
import YearsList from "./components/YearsList";
import CreateYearModal, { type YearForm, type YearFormTouched } from "./components/CreateYearModal";
import TermsModal from "./components/TermsModal";

const EMPTY_FORM: YearForm = {
  label: "",
  start_date: "",
  end_date: "",
  is_current: false,
};

export default function AcademicYears() {
  const { data: years, isLoading, isError, refetch } = useAcademicYears();
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

  const dateRangeInvalid = !!form.start_date && !!form.end_date && form.end_date <= form.start_date;

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
    deleteYear.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
  };

  return (
    <div className="os-page">
      <div
        className="os-page__header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 className="os-page__title">Academic Years</h1>
          <p className="os-page__subtitle">
            Manage academic year periods for the school
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          New Academic Year
        </Button>
      </div>

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
        isPending={deleteYear.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />

      {termsFor && <TermsModal year={termsFor} onClose={() => setTermsFor(null)} />}
    </div>
  );
}
