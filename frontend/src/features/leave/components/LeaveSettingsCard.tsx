import { useState } from "react";
import { Button, Card } from "antd";
import { SaveOutlined, UndoOutlined } from "@ant-design/icons";
import NumberField from "@/shared/ui/NumberField";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useToast } from "@/shared/ui/toast/useToast";
import { useLeavePolicy, useUpdateLeavePolicy } from "@/features/leave/queries/useLeave";
import type { LeavePolicy } from "@/features/leave/api/leave";

type Form = Record<keyof LeavePolicy, number | null>;

// Same ranges as the leave_settings CHECK constraints.
const FIELDS: { key: keyof LeavePolicy; label: string; help: string; min: number; max: number }[] = [
  { key: "casual_days_per_year", label: "Casual leave (days a year)", help: "Half days count as 0.5. Unused days do not carry forward.", min: 0, max: 366 },
  { key: "sick_days_per_year", label: "Medical leave (days a year)", help: "Full working days only.", min: 0, max: 366 },
  { key: "short_leaves_per_month", label: "Short leaves a month", help: "How many times a teacher can come late or leave early.", min: 0, max: 31 },
  { key: "short_leave_max_minutes", label: "Longest short leave (minutes)", help: "Each short leave can be at most this long.", min: 15, max: 480 },
  { key: "maternity_days", label: "Maternity leave on full pay (days)", help: "Per confinement. The rest is applied for as no-pay leave.", min: 1, max: 366 },
];

// Public service scheme defaults from ADR 0010.
const DEFAULTS: LeavePolicy = { casual_days_per_year: 21, sick_days_per_year: 20, short_leaves_per_month: 2, short_leave_max_minutes: 90, maternity_days: 84 };

const valid = (f: (typeof FIELDS)[number], v: number | null) => v !== null && Number.isInteger(v) && v >= f.min && v <= f.max;

// Settings > Leave: the limits every teacher's balance and application is checked against.
export default function LeaveSettingsCard() {
  const { data, isLoading, isError, refetch } = useLeavePolicy();
  const update = useUpdateLeavePolicy();
  const { showToast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [loaded, setLoaded] = useState<LeavePolicy | null>(null);

  if (data && data !== loaded) {
    setForm({ ...data });
    setLoaded(data);
  }

  if (isLoading) return <LoadingSpinner />;
  if (isError || !form) return <ErrorMessage message="Could not load leave settings." onRetry={refetch} />;

  const allValid = FIELDS.every((f) => valid(f, form[f.key]));
  const save = () => {
    if (!allValid) return;
    update.mutate(form as LeavePolicy, { onSuccess: () => showToast({ kind: "success", title: "Leave settings saved", subtitle: "Balances now use the new limits." }) });
  };

  return (
    <Card
      className="os-form-card"
      title="Leave limits"
      extra={<Button type="primary" icon={<SaveOutlined />} onClick={save} loading={update.isPending} disabled={!allValid}>Save</Button>}
    >
      <div className="os-stack os-gap-5">
        <p className="os-text-sm os-c-secondary os-m-0">
          Teachers' balances and new applications use these limits. Leave already approved is not changed. Duty and no-pay leave have no limit.
        </p>
        <MutationErrorNotification isError={update.isError} error={update.error} title="Could not save leave settings" />
        <div className="os-settings-grid">
          {FIELDS.map((f) => (
            <NumberField
              key={f.key}
              id={`leave-${f.key}`}
              label={f.label}
              helperText={f.help}
              min={f.min}
              max={f.max}
              value={form[f.key]}
              invalid={!valid(f, form[f.key])}
              invalidText={`Enter a whole number from ${f.min} to ${f.max}.`}
              onChange={(v) => setForm((cur) => (cur ? { ...cur, [f.key]: v } : cur))}
            />
          ))}
        </div>
        <Button type="link" size="small" icon={<UndoOutlined />} className="os-p-0 os-self-start" onClick={() => setForm({ ...DEFAULTS })}>
          Use public service defaults (21, 20, 2, 90, 84)
        </Button>
      </div>
    </Card>
  );
}
