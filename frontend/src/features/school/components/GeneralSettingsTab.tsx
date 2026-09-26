import { useState } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Save, Edit } from "@carbon/icons-react";
import { isNotFoundError } from "@/shared/api/errors";
import { useSchool, useUpdateSchool, useCreateSchool } from "@/features/school/queries/useSchool";
import type { School } from "@/features/school/api/school";
import SchoolInfoCard, { type SchoolFormValues } from "@/features/school/components/SchoolInfoCard";
import AcademicSettingsCard from "@/features/school/components/AcademicSettingsCard";
import { gradeRangeErrors } from "@/features/school/lib/gradeRange";
import SystemInfoCards from "@/features/school/components/SystemInfoCards";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useToast } from "@/shared/ui/toast/useToast";

type SettingsForm = SchoolFormValues & { grade_from: number | ""; grade_to: number | "" };

const EMPTY_FORM: SettingsForm = { name: "", address: "", phone: "", email: "", logo_url: "", school_type: "mixed", grade_from: "", grade_to: "" };

const schoolToForm = (s: School): SettingsForm => ({
  name: s.name,
  address: s.address ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  logo_url: s.logo_url ?? "",
  school_type: s.school_type ?? "mixed",
  grade_from: s.grade_from ?? "",
  grade_to: s.grade_to ?? "",
});

// School profile and academic range; also the first-run "create school" form.
export default function GeneralSettingsTab() {
  const { data: school, isLoading, isError, error, refetch } = useSchool();
  const updateSchool = useUpdateSchool();
  const createSchool = useCreateSchool();
  const noSchoolYet = isNotFoundError(error);

  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (school && loadedFor !== school.id) {
    setForm(schoolToForm(school));
    setLoadedFor(school.id);
  }

  const editable = editing || noSchoolYet;
  const rangeInvalid = gradeRangeErrors(form.grade_from, form.grade_to).invalid;
  const pending = updateSchool.isPending || createSchool.isPending;

  const flashSaved = () => {
    setEditing(false);
    showToast({ kind: "success", title: "Saved" });
  };

  const save = () => {
    if (rangeInvalid || !form.name.trim()) return;
    const data = {
      ...form,
      grade_from: form.grade_from === "" ? null : Number(form.grade_from),
      grade_to: form.grade_to === "" ? null : Number(form.grade_to),
    };
    if (noSchoolYet) createSchool.mutate(data, { onSuccess: flashSaved });
    else if (school) updateSchool.mutate({ id: school.id, data }, { onSuccess: flashSaved });
  };

  return (
    <>
      <div className="os-flex os-gap-2 os-items-center os-justify-end os-my-4">
        {pending && <span className="os-text-sm os-c-secondary">Saving…</span>}
        {noSchoolYet ? (
          <Button renderIcon={Save} kind="primary" size="md" onClick={save} disabled={pending || rangeInvalid || !form.name.trim()}>Create school</Button>
        ) : editing ? (
          <>
            <Button kind="secondary" size="md" onClick={() => { if (school) setForm(schoolToForm(school)); setEditing(false); }} disabled={pending}>Cancel</Button>
            <Button renderIcon={Save} kind="primary" size="md" onClick={save} disabled={pending || rangeInvalid}>Save changes</Button>
          </>
        ) : (
          <Button renderIcon={Edit} kind="secondary" size="md" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && !noSchoolYet && <ErrorMessage message="Could not load school information." onRetry={refetch} />}
      {noSchoolYet && (
        <InlineNotification kind="info" lowContrast hideCloseButton title="No school set up yet" subtitle="Fill in your school's details below and save to finish setup." className="os-mb-4 os-max-w-full" />
      )}
      <MutationErrorNotification isError={createSchool.isError} error={createSchool.error} title="Could not create school" />
      <MutationErrorNotification isError={updateSchool.isError} error={updateSchool.error} title="Could not save changes" />

      {!isLoading && (!isError || noSchoolYet) && (
        <SchoolInfoCard values={form} editing={editable} onChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))} />
      )}
      <AcademicSettingsCard gradeFrom={form.grade_from} gradeTo={form.grade_to} editable={editable} onChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))} />
      <SystemInfoCards />
    </>
  );
}
