import { useState } from "react";
import { Button, NumberInput, Toggle } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { useActivationSettings, useUpdateActivationSettings } from "@/features/activation/queries/useActivation";
import type { ActivationSettings } from "@/features/activation/api/activation";
import { closesAtFromYmd, opensAtFromYmd, ymdFromClosesAt, ymdFromOpensAt } from "@/features/activation/lib/window";
import SectionCard from "@/shared/ui/SectionCard";
import DateField from "@/shared/ui/DateField";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useToast } from "@/shared/ui/toast/useToast";

interface Form {
  student_enabled: boolean;
  parent_enabled: boolean;
  opens: string;
  closes: string;
  code_ttl_days: number | "";
}

const toForm = (s: ActivationSettings): Form => ({
  student_enabled: s.student_enabled,
  parent_enabled: s.parent_enabled,
  opens: ymdFromOpensAt(s.opens_at),
  closes: ymdFromClosesAt(s.closes_at),
  code_ttl_days: s.code_ttl_days,
});

export default function ActivationSettingsCard() {
  const { data, isLoading, isError, refetch } = useActivationSettings();
  const update = useUpdateActivationSettings();
  const { showToast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [loaded, setLoaded] = useState<ActivationSettings | null>(null);

  if (data && data !== loaded) {
    setForm(toForm(data));
    setLoaded(data);
  }

  if (isLoading) return <LoadingSpinner />;
  if (isError || !form) return <ErrorMessage message="Could not load activation settings." onRetry={refetch} />;

  const set = <K extends keyof Form>(field: K, value: Form[K]) => setForm((f) => (f ? { ...f, [field]: value } : f));
  const ttlValid = typeof form.code_ttl_days === "number" && Number.isInteger(form.code_ttl_days) && form.code_ttl_days >= 1 && form.code_ttl_days <= 90;
  const windowValid = !form.opens || !form.closes || form.closes >= form.opens;

  const save = () => {
    if (!ttlValid || !windowValid) return;
    update.mutate(
      {
        student_enabled: form.student_enabled,
        parent_enabled: form.parent_enabled,
        opens_at: opensAtFromYmd(form.opens),
        closes_at: closesAtFromYmd(form.closes),
        code_ttl_days: Number(form.code_ttl_days),
      },
      { onSuccess: () => showToast({ kind: "success", title: "Activation settings saved" }) },
    );
  };

  return (
    <SectionCard
      title="Self-activation"
      meta={<Button renderIcon={Save} kind="primary" size="sm" onClick={save} disabled={update.isPending || !ttlValid || !windowValid}>Save</Button>}
    >
      <p className="os-text-sm os-c-secondary os-mt-0 os-mb-4">
        People can create their own login with a code you issue below. Turned off, nobody of that type can activate and no codes can be generated for them. Admins can still create logins as before.
      </p>
      <MutationErrorNotification isError={update.isError} error={update.error} title="Could not save settings" />
      <div className="os-grid os-grid-cols-2 os-gap-5 os-mb-5">
        <Toggle id="activation-students" labelText="Students" labelA="Off" labelB="On" toggled={form.student_enabled} onToggle={(on) => set("student_enabled", on)} />
        <Toggle id="activation-parents" labelText="Guardians" labelA="Off" labelB="On" toggled={form.parent_enabled} onToggle={(on) => set("parent_enabled", on)} />
        <DateField id="activation-opens" labelText="Opens on (optional)" value={form.opens} onChange={(v) => set("opens", v)} />
        <DateField
          id="activation-closes"
          labelText="Closes after (optional)"
          value={form.closes}
          minDate={form.opens || undefined}
          invalid={!windowValid}
          invalidText="Must be on or after the opening date."
          onChange={(v) => set("closes", v)}
        />
        <NumberInput
          id="activation-ttl"
          label="Codes stay valid for (days)"
          helperText="Applies to codes generated after saving."
          min={1}
          max={90}
          value={form.code_ttl_days}
          invalid={!ttlValid}
          invalidText="Enter a whole number from 1 to 90."
          onChange={(_e, { value }) => set("code_ttl_days", value === "" ? "" : Number(value))}
        />
      </div>
      {(form.opens || form.closes) && (
        <Button kind="ghost" size="sm" onClick={() => setForm((f) => (f ? { ...f, opens: "", closes: "" } : f))}>Clear dates</Button>
      )}
    </SectionCard>
  );
}
