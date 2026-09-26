import { useState } from "react";
import { Save } from "@carbon/icons-react";
import { Button, TextInput, NumberInput, InlineNotification, SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="os-text-xs os-c-secondary os-mt-0 os-mx-0 os-mb-1 os-fw-600 os-uppercase">
        {label}
      </p>
      <p className="os-text-lg os-fw-300 os-c-primary os-m-0">{value}</p>
    </div>
  );
}

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

  return (
    <>
      {initial && (
        <div className="os-grid os-grid-cols-3 os-gap-5 os-bg-layer-hover os-py-4 os-px-6 os-mb-6 os-border"
        >
          <SummaryStat label="School hours" value={`${initial.school_start_time} – ${initial.school_end_time}`} />
          <SummaryStat
            label="Periods & duration"
            value={`${initial.number_of_periods} periods (${initial.period_duration_minutes} mins)`}
          />
          <SummaryStat label="Default interval" value={`${initial.interval_duration_minutes} minutes`} />
        </div>
      )}

      <div className="os-flex os-justify-end os-mb-4">
        <Button renderIcon={Save} kind="primary" onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      <MutationErrorNotification
        isError={upsert.isError}
        error={upsert.error}
        title="Could not save settings"
        onClose={() => upsert.reset()} className="os-mb-4"
      />
      {upsert.isSuccess && (
        <InlineNotification
          kind="success"
          title="Settings saved"
          lowContrast
          onClose={() => upsert.reset()} className="os-max-w-full os-mb-4"
        />
      )}
      <div className="os-grid os-grid-2-max-20 os-gap-5">
        <TextInput
          id="school-start-time"
          labelText="School starting time"
          type="time"
          value={form.school_start_time}
          onChange={(e) => setForm((f) => ({ ...f, school_start_time: e.target.value }))}
        />
        <TextInput
          id="school-end-time"
          labelText="School ending time"
          type="time"
          value={form.school_end_time}
          onChange={(e) => setForm((f) => ({ ...f, school_end_time: e.target.value }))}
        />
        <NumberInput
          id="number-of-periods"
          label="Number of periods"
          min={1}
          max={15}
          value={form.number_of_periods}
          onChange={(_e, { value }) =>
            setForm((f) => ({ ...f, number_of_periods: Number(value ?? f.number_of_periods) }))
          }
        />
        <NumberInput
          id="period-duration"
          label="Period duration (minutes)"
          min={10}
          max={120}
          value={form.period_duration_minutes}
          onChange={(_e, { value }) =>
            setForm((f) => ({ ...f, period_duration_minutes: Number(value ?? f.period_duration_minutes) }))
          }
        />
        <NumberInput
          id="interval-duration"
          label="Default interval duration (minutes)"
          min={5}
          max={120}
          value={form.interval_duration_minutes}
          onChange={(_e, { value }) =>
            setForm((f) => ({ ...f, interval_duration_minutes: Number(value ?? f.interval_duration_minutes) }))
          }
        />
      </div>
    </>
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

      <Tabs>
        <TabList aria-label="Timetable settings tabs">
          <Tab>Default templates</Tab>
          <Tab>Grade interval times</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="os-py-4 os-px-0">
            <div className="os-section os-p-6">
              {isLoading ? (
                <SkeletonText width="40%" />
              ) : (
                <SettingsForm key={settings ? "loaded" : "empty"} academicYearId={currentYear.id} initial={settings} />
              )}
            </div>
          </TabPanel>
          <TabPanel className="os-py-4 os-px-0">
            <GradeSections inline />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
