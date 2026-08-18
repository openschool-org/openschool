// This file renders the TimetableSettings page, allowing administrators to configure default templates and custom intervals for different grades.

import { useState } from "react";
import { Save } from "@carbon/icons-react";
import { Button, TextInput, NumberInput, InlineNotification, SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useTimetableSettings, useUpsertTimetableSettings } from "../../../queries/timetable/useTimetableSettings";
import type { TimetableSettings as TimetableSettingsData } from "../../../services/timetable/timetableSettings";
import { getErrorMessage } from "../../../lib/errorMessage";
import EmptyState from "../../../components/common/EmptyState";
import GradeSections from "./GradeSections";

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

  return (
    <>
      {initial && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.25rem",
            background: "#f4f4f4",
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            border: "1px solid #e0e0e0",
          }}
        >
          <div>
            <p style={{ fontSize: "0.75rem", color: "#525252", margin: "0 0 0.25rem", fontWeight: 600, textTransform: "uppercase" }}>School Hours</p>
            <p style={{ fontSize: "1.125rem", fontWeight: 300, color: "#161616", margin: 0 }}>
              {initial.school_start_time} – {initial.school_end_time}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#525252", margin: "0 0 0.25rem", fontWeight: 600, textTransform: "uppercase" }}>Periods & Duration</p>
            <p style={{ fontSize: "1.125rem", fontWeight: 300, color: "#161616", margin: 0 }}>
              {initial.number_of_periods} periods ({initial.period_duration_minutes} mins)
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#525252", margin: "0 0 0.25rem", fontWeight: 600, textTransform: "uppercase" }}>Default Interval</p>
            <p style={{ fontSize: "1.125rem", fontWeight: 300, color: "#161616", margin: 0 }}>
              {initial.interval_duration_minutes} minutes
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <Button renderIcon={Save} kind="primary" onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {upsert.isError && (
        <InlineNotification
          kind="error"
          title="Could not save settings"
          subtitle={getErrorMessage(upsert.error)}
          lowContrast
          onClose={() => upsert.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}
      {upsert.isSuccess && (
        <InlineNotification
          kind="success"
          title="Settings saved"
          lowContrast
          onClose={() => upsert.reset()}
          style={{ maxWidth: "100%", marginBottom: "1rem" }}
        />
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 20rem))", gap: "1.25rem" }}>
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


export default function TimetableSettings() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: settings, isLoading } = useTimetableSettings(currentYear?.id ?? "");

  if (!currentYear) {
    return (
      <div className="os-page">
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Timetable Settings</h1>
          </div>
        </div>
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
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Timetable Settings</h1>
          <p className="os-page__subtitle">
            Configure default timetable structures and custom grade interval times for {currentYear.label}.
          </p>
        </div>
      </div>

      <Tabs>
        <TabList aria-label="Timetable Settings Tabs">
          <Tab>Default Templates</Tab>
          <Tab>Grade Interval Times</Tab>
        </TabList>
        <TabPanels>
          <TabPanel style={{ padding: "1rem 0" }}>
            <div className="os-section" style={{ padding: "1.5rem" }}>
              {isLoading ? (
                <SkeletonText width="40%" />
              ) : (
                <SettingsForm key={settings ? "loaded" : "empty"} academicYearId={currentYear.id} initial={settings} />
              )}
            </div>
          </TabPanel>
          <TabPanel style={{ padding: "1rem 0" }}>
            <GradeSections inline />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
