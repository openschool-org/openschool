import { useState } from "react";
import {
  Button,
  NumberInput,
  Select,
  SelectItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InlineNotification,
} from "@carbon/react";
import { Save, Edit, Settings as SettingsIcon } from "@carbon/icons-react";
import { getErrorMessage, isNotFoundError } from "../../../lib/errorMessage";
import SchoolInfoCard, { type SchoolFormValues } from "../../../components/school/SchoolInfoCard";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import ErrorMessage from "../../../components/common/ErrorMessage";
import { useSchool, useUpdateSchool, useCreateSchool } from "../../../queries/useSchool";
import type { School } from "../../../services/school";
import Houses from "./Houses";
import AuditLog from "./AuditLog";

type SettingsForm = SchoolFormValues & {
  grade_from: number | "";
  grade_to: number | "";
};

const EMPTY_FORM: SettingsForm = {
  name: "",
  address: "",
  phone: "",
  email: "",
  logo_url: "",
  grade_from: "",
  grade_to: "",
};

function schoolToForm(s: School): SettingsForm {
  return {
    name: s.name,
    address: s.address ?? "",
    phone: s.phone ?? "",
    email: s.email ?? "",
    logo_url: s.logo_url ?? "",
    grade_from: s.grade_from ?? "",
    grade_to: s.grade_to ?? "",
  };
}

export default function SettingsPage() {
  const { data: school, isLoading, isError, error, refetch } = useSchool();
  const updateSchool = useUpdateSchool();
  const createSchool = useCreateSchool();

  const noSchoolYet = isNotFoundError(error);

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (school && loadedFor !== school.id) {
    setForm(schoolToForm(school));
    setLoadedFor(school.id);
  }

  const isEditable = editing || noSchoolYet;

  const handleEdit = () => setEditing(true);

  const handleCancel = () => {
    if (school) setForm(schoolToForm(school));
    setEditing(false);
  };

  const GRADE_MIN = 1;
  const GRADE_MAX = 13;

  const gradeFromOutOfRange =
    form.grade_from !== "" && (form.grade_from < GRADE_MIN || form.grade_from > GRADE_MAX);
  const gradeToOutOfRange =
    form.grade_to !== "" && (form.grade_to < GRADE_MIN || form.grade_to > GRADE_MAX);
  const gradeRangeInvalid =
    gradeFromOutOfRange ||
    gradeToOutOfRange ||
    (form.grade_from !== "" &&
      form.grade_to !== "" &&
      Number(form.grade_to) < Number(form.grade_from));

  const handleSave = () => {
    if (gradeRangeInvalid) return;

    const data = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email,
      logo_url: form.logo_url,
      grade_from: form.grade_from === "" ? null : Number(form.grade_from),
      grade_to: form.grade_to === "" ? null : Number(form.grade_to),
    };

    if (noSchoolYet) {
      if (!form.name.trim()) return;
      createSchool.mutate(data, {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      });
      return;
    }

    if (!school) return;
    updateSchool.mutate(
      { id: school.id, data },
      {
        onSuccess: () => {
          setSaved(true);
          setEditing(false);
          setTimeout(() => setSaved(false), 2500);
        },
      }
    );
  };

  const handleChange = (field: keyof SchoolFormValues, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Settings</h1>
          <p className="os-page__subtitle">School configuration and system preferences</p>
        </div>
      </div>

      <Tabs>
        <TabList aria-label="Settings sections">
          <Tab>General</Tab>
          <Tab>Houses</Tab>
          <Tab>Audit Log</Tab>
        </TabList>
        <TabPanels>
          <TabPanel style={{ padding: 0 }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "flex-end", margin: "1rem 0" }}>
          {saved && <span style={{ fontSize: "0.8125rem", color: "#24a148" }}>✓ Saved</span>}
          {(updateSchool.isPending || createSchool.isPending) && (
            <span style={{ fontSize: "0.8125rem", color: "#525252" }}>Saving…</span>
          )}
          {noSchoolYet ? (
            <Button
              renderIcon={Save}
              kind="primary"
              size="md"
              onClick={handleSave}
              disabled={createSchool.isPending || gradeRangeInvalid || !form.name.trim()}
            >
              Create School
            </Button>
          ) : editing ? (
            <>
              <Button kind="secondary" size="md" onClick={handleCancel} disabled={updateSchool.isPending}>Cancel</Button>
              <Button renderIcon={Save} kind="primary" size="md" onClick={handleSave} disabled={updateSchool.isPending || gradeRangeInvalid}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button renderIcon={Edit} kind="secondary" size="md" onClick={handleEdit}>Edit</Button>
          )}
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && !noSchoolYet && <ErrorMessage message="Could not load school information." onRetry={refetch} />}
      {noSchoolYet && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="No school set up yet"
          subtitle="Fill in your school's details below and save to finish setup."
          style={{ marginBottom: "1rem", maxWidth: "100%" }}
        />
      )}
      {createSchool.isError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Could not create school"
          subtitle={getErrorMessage(createSchool.error)}
          style={{ marginBottom: "1rem", maxWidth: "100%" }}
        />
      )}

      {!isLoading && (!isError || noSchoolYet) && (
        <SchoolInfoCard values={form} editing={isEditable} onChange={handleChange} />
      )}

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Academic Settings</h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <NumberInput
              id="grade-from"
              label="Lowest grade"
              helperText="The first grade this school runs (1–13)."
              min={GRADE_MIN}
              max={GRADE_MAX}
              disabled={!isEditable}
              invalid={gradeFromOutOfRange}
              invalidText={`Must be between ${GRADE_MIN} and ${GRADE_MAX}.`}
              value={form.grade_from}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, grade_from: value === "" ? "" : Number(value) }))
              }
            />
            <NumberInput
              id="grade-to"
              label="Highest grade"
              helperText="The last grade this school runs (1–13)."
              min={GRADE_MIN}
              max={GRADE_MAX}
              disabled={!isEditable}
              invalid={gradeRangeInvalid}
              invalidText={
                gradeToOutOfRange
                  ? `Must be between ${GRADE_MIN} and ${GRADE_MAX}.`
                  : "Highest grade must be greater than or equal to lowest grade."
              }
              value={form.grade_to}
              onChange={(_e, { value }) =>
                setForm((f) => ({ ...f, grade_to: value === "" ? "" : Number(value) }))
              }
            />
          </div>
          {/* These four aren't backed by any field on the School model yet — disabled
              rather than wired to a no-op onChange, so the UI doesn't imply a save
              that never happens (audit.md M-13). Re-enable once there's a backend
              field for each to actually persist to. */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <Select id="timezone" labelText="Time Zone" defaultValue="asia_colombo" disabled helperText="Not yet configurable">
              <SelectItem value="asia_colombo" text="Asia/Colombo (UTC+5:30)" />
              <SelectItem value="utc" text="UTC" />
            </Select>
            <Select id="language" labelText="Default Language" defaultValue="english" disabled helperText="Not yet configurable">
              <SelectItem value="english" text="English" />
              <SelectItem value="sinhala" text="Sinhala" />
              <SelectItem value="tamil" text="Tamil" />
            </Select>
            <Select id="calendar" labelText="Academic Calendar" defaultValue="jan_dec" disabled helperText="Not yet configurable">
              <SelectItem value="jan_dec" text="January - December" />
              <SelectItem value="sep_aug" text="September - August" />
            </Select>
            <Select id="grading" labelText="Grading System" defaultValue="percentage" disabled helperText="Not yet configurable">
              <SelectItem value="percentage" text="Percentage (0-100)" />
              <SelectItem value="grade" text="Grade (A-F)" />
            </Select>
          </div>
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Attendance</h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              "Teachers can mark students Present, Late, or Absent.",
              "Guardians are notified automatically when a student is marked absent.",
              "Sessions become read-only 24 hours after being taken — a System Administrator can still edit past that point, and every such edit is recorded in the audit log.",
            ].map((text) => (
              <p key={text} style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>
                {text}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">About OpenSchool</h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1rem" }}>
            <SettingsIcon size={32} style={{ fill: "#406AAF" }} />
            <div>
              <p style={{ margin: "0 0 0.15rem", fontWeight: 700, fontSize: "1rem", color: "#161616" }}>OpenSchool</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>Open-source school management platform for Sri Lanka</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
            {[
              ["Version",    "0.1.0 - development build"],
              ["License",    "MIT"],
              ["Repository", "github.com/openschool-org"],
              ["Support",    "github.com/openschool-org/issues"],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                <span style={{ color: "#8d8d8d", marginRight: "0.5rem" }}>{label}:</span>
                <span style={{ color: "#161616" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <div style={{ marginTop: "1rem" }}>
              <Houses />
            </div>
          </TabPanel>
          <TabPanel style={{ padding: 0 }}>
            <div style={{ marginTop: "1rem" }}>
              <AuditLog />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
