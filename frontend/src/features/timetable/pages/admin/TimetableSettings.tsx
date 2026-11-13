import { useState } from "react";
import { Alert, Button, Descriptions } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { SkeletonText } from "@/shared/ui/Skeleton";
import NumberField from "@/shared/ui/NumberField";
import TextField from "@/shared/ui/TextField";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTimetableSettings, useUpsertTimetableSettings } from "@/features/timetable/queries/useTimetableSettings";
import type { TimetableSettings as TimetableSettingsData } from "@/features/timetable/api/timetableSettings";
import EmptyState from "@/shared/ui/EmptyState";
import GradeSections from "@/features/timetable/pages/admin/GradeSections";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

const DEFAULTS = {
  school_start_time: "08:00",
  school_end_time: "13:25",
  number_of_periods: 8,
  period_duration_minutes: 40,
  interval_duration_minutes: 30,
};

function SettingsForm({
  academicYearId,
  initial,
}: {
  academicYearId: string;
  initial: TimetableSettingsData | undefined;
}) {
  const upsert = useUpsertTimetableSettings();
  const [form, setForm] = useState(
    initial
      ? {
          school_start_time: initial.school_start_time,
          school_end_time: initial.school_end_time,
          number_of_periods: initial.number_of_periods,
          period_duration_minutes: initial.period_duration_minutes,
          interval_duration_minutes: initial.interval_duration_minutes,
        }
      : DEFAULTS,
  );

  const [loadedForYear, setLoadedForYear] = useState<string | null>(null);
  if (initial && loadedForYear !== academicYearId) {
    setForm({
      school_start_time: initial.school_start_time,
      school_end_time: initial.school_end_time,
      number_of_periods: initial.number_of_periods,
      period_duration_minutes: initial.period_duration_minutes,
      interval_duration_minutes: initial.interval_duration_minutes,
    });
    setLoadedForYear(academicYearId);
  }

  const handleSave = () => {
    upsert.mutate({ academic_year_id: academicYearId, ...form });
  };

  const num = (key: "number_of_periods" | "period_duration_minutes" | "interval_duration_minutes") => (v: number | null) =>
    setForm((f) => ({ ...f, [key]: v ?? f[key] }));

  return (
    <div className="os-section">
      <div className="os-section__header">
        <div>
          <h2 className="os-section__title">School day</h2>
          <p className="os-text-sm os-c-secondary os-m-0">The default period grid new grade sections start from.</p>
        </div>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={upsert.isPending}>
          {upsert.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      <div className="os-section__body os-stack os-gap-5">
        {initial && (
          <Descriptions
            className="os-facts"
            layout="vertical"
            column={{ xs: 1, sm: 3 }}
            items={[
              { key: "hours", label: "School hours", children: `${initial.school_start_time} – ${initial.school_end_time}` },
              { key: "periods", label: "Periods", children: `${initial.number_of_periods} × ${initial.period_duration_minutes} min` },
              { key: "interval", label: "Default interval", children: `${initial.interval_duration_minutes} min` },
            ]}
          />
        )}
        <MutationErrorNotification isError={upsert.isError} error={upsert.error} title="Could not save settings" onClose={() => upsert.reset()} />
        {upsert.isSuccess && <Alert type="success" showIcon closable title="Settings saved" onClose={() => upsert.reset()} />}
        <div className="os-tt-settings-grid">
          <TextField id="school-start-time" label="School starts" type="time" value={form.school_start_time} onChange={(v) => setForm((f) => ({ ...f, school_start_time: v }))} />
          <TextField id="school-end-time" label="School ends" type="time" value={form.school_end_time} onChange={(v) => setForm((f) => ({ ...f, school_end_time: v }))} />
          <NumberField id="number-of-periods" label="Number of periods" min={1} max={15} value={form.number_of_periods} onChange={num("number_of_periods")} />
          <NumberField id="period-duration" label="Period length (minutes)" min={10} max={120} value={form.period_duration_minutes} onChange={num("period_duration_minutes")} />
          <NumberField id="interval-duration" label="Interval length (minutes)" min={5} max={120} value={form.interval_duration_minutes} onChange={num("interval_duration_minutes")} />
        </div>
      </div>
    </div>
  );
}

export default function TimetableSettings({ inline = false }: { inline?: boolean }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: settings, isLoading } = useTimetableSettings(currentYear?.id ?? "");

  if (!currentYear) {
    return (
      <div className={inline ? "" : "os-page"}>
        {!inline && (
          <div className="os-page__header">
            <div className="os-page__header-left">
              <h1 className="os-page__title">Timetable settings</h1>
            </div>
          </div>
        )}
        <div className="os-section">
          <EmptyState
            title="No current academic year"
            description="Set an academic year as current before configuring timetable settings."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Timetable settings</h1>
            <p className="os-page__subtitle">Default periods and interval times for {currentYear.label}.</p>
          </div>
        </div>
      )}

      <div className="os-stack os-gap-6">
        {isLoading ? (
          <div className="os-section os-p-6"><SkeletonText width="40%" /></div>
        ) : (
          <SettingsForm key={settings ? "loaded" : "empty"} academicYearId={currentYear.id} initial={settings} />
        )}
        <GradeSections inline />
      </div>
    </div>
  );
}
