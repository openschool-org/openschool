import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Button,
  TextInput,
  NumberInput,
  Checkbox,
  ProgressIndicator,
  ProgressStep,
  InlineNotification,
  InlineLoading,
} from "@carbon/react";
import {
  Enterprise,
  Home,
  Education,
  Building,
  Language,
  CheckmarkFilled,
  TrashCan,
  Add,
  ArrowRight,
  Layers,
  Book,
  UserMultiple,
  EventSchedule,
  ChevronRight,
} from "@carbon/icons-react";
import LogoUpload from "../../../components/school/LogoUpload";
import { useCreateSchool } from "../../../queries/useSchool";
import { useCreateHouse } from "../../../queries/useHouses";
import { useCreateGrade } from "../../../queries/useGrades";
import { useCreateAcademicYear } from "../../../queries/useAcademicYears";
import { useCreateClass, useCreateStream, useCreateStreamGroup } from "../../../queries/useClasses";
import { useCreateMedium } from "../../../queries/useCurriculum";
import { getErrorMessage } from "../../../lib/errorMessage";
import { silentProgressStatus } from "../../../lib/carbonA11y";
import type { Grade } from "../../../services/grade";

type ALStreamKey = "science_physical" | "science_bio" | "commerce" | "arts" | "technology";

interface ALStreamDef {
  key: ALStreamKey;
  label: string;
  streamName: string;
  groupName: string | null;
  defaultCode: string;
}

const AL_STREAM_DEFS: ALStreamDef[] = [
  { key: "science_physical", label: "Physical Science", streamName: "Science", groupName: "Physical Science", defaultCode: "M" },
  { key: "science_bio", label: "Bio Science", streamName: "Science", groupName: "Bio Science", defaultCode: "B" },
  { key: "commerce", label: "Commerce", streamName: "Commerce", groupName: null, defaultCode: "C" },
  { key: "arts", label: "Arts", streamName: "Arts", groupName: null, defaultCode: "A" },
  { key: "technology", label: "Technology", streamName: "Technology", groupName: null, defaultCode: "T" },
];

const AL_GRADE_NUMBERS = new Set([12, 13]);

const ACCENT = "#406AAF";
const GRADE_MIN = 1;
const GRADE_MAX = 13;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = ["School", "Houses", "Grades", "Classes", "Mediums", "Done"] as const;

function StepShell({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div
          style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "50%",
            background: "#edf2fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} style={{ fill: ACCENT }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#161616" }}>{title}</h2>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function RepeatableRow({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", marginBottom: "0.75rem" }}>
      <div style={{ flex: 1, display: "flex", gap: "0.5rem" }}>{children}</div>
      <Button
        hasIconOnly
        kind="ghost"
        size="md"
        iconDescription="Remove"
        renderIcon={TrashCan}
        onClick={onRemove}
      />
    </div>
  );
}

// Tracks which phases of the final submission have already succeeded, so
// clicking Retry after a mid-sequence failure resumes instead of
// re-creating (and duplicating) whatever already went through.
interface SubmitProgress {
  school: boolean;
  houses: boolean;
  grades: Grade[] | null;
  classes: boolean;
  mediums: boolean;
}

export default function SchoolSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createSchool = useCreateSchool();
  const createHouse = useCreateHouse();
  const createGrade = useCreateGrade();
  const createAcademicYear = useCreateAcademicYear();
  const createClass = useCreateClass();
  const createMedium = useCreateMedium();
  const createStream = useCreateStream();
  const createStreamGroup = useCreateStreamGroup();

  // ── Step 0: School ──────────────────────────────────────────────────────
  const [school, setSchool] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    grade_from: GRADE_MIN as number | "",
    grade_to: GRADE_MAX as number | "",
  });
  const [schoolTouched, setSchoolTouched] = useState(false);

  const gradeRangeInvalid =
    school.grade_from !== "" &&
    school.grade_to !== "" &&
    Number(school.grade_to) < Number(school.grade_from);
  const schoolValid =
    school.name.trim().length > 0 &&
    school.phone.trim().length > 0 &&
    EMAIL_RE.test(school.email.trim()) &&
    school.address.trim().length > 0 &&
    !gradeRangeInvalid;

  // ── Step 1: Houses ───────────────────────────────────────────────────────
  const [houses, setHouses] = useState([{ name: "", code: "" }]);
  const [housesSkipped, setHousesSkipped] = useState(false);

  // ── Step 2: Grades ───────────────────────────────────────────────────────
  // The range picked in Step 0 is what the Grades step both pre-selects AND
  // displays, so they can never show/select grades outside it. Falls back
  // to the full 1-13 range only if the school step was somehow left blank.
  const gradeRangeStart = school.grade_from === "" ? GRADE_MIN : Number(school.grade_from);
  const gradeRangeEnd = school.grade_to === "" ? GRADE_MAX : Number(school.grade_to);

  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set());

  // Re-syncs whenever the chosen range actually changes — e.g. the user
  // goes Back to Step 0 and edits the range after already visiting this
  // step. Without this, a stale selection from the first render (or a
  // previous range) could silently include grades outside the new range,
  // which then leak into the grades and classes actually created. Adjusted
  // during render (React's supported pattern for this) rather than in an
  // effect, so it takes effect in the same render instead of one tick late.
  const [syncedRange, setSyncedRange] = useState<[number, number] | null>(null);
  if (
    school.grade_from !== "" &&
    school.grade_to !== "" &&
    (syncedRange === null || syncedRange[0] !== gradeRangeStart || syncedRange[1] !== gradeRangeEnd)
  ) {
    setSyncedRange([gradeRangeStart, gradeRangeEnd]);
    const all = new Set<number>();
    for (let n = gradeRangeStart; n <= gradeRangeEnd; n++) all.add(n);
    setSelectedGrades(all);
  }

  const orderedSelectedGrades = [...selectedGrades].sort((a, b) => a - b);
  const regularGradeNumbers = orderedSelectedGrades.filter((n) => !AL_GRADE_NUMBERS.has(n));
  const alGradeNumbers = orderedSelectedGrades.filter((n) => AL_GRADE_NUMBERS.has(n));

  // ── Step 3: Classes ──────────────────────────────────────────────────────
  const now = new Date();
  const [yearLabel, setYearLabel] = useState(String(now.getFullYear()));
  const [sectionsPerGrade, setSectionsPerGrade] = useState<Record<number, number>>({});
  const [classesSkipped, setClassesSkipped] = useState(false);

  const [alStreams, setAlStreams] = useState<Record<ALStreamKey, { enabled: boolean; code: string; sections: number }>>(
    () =>
      Object.fromEntries(
        AL_STREAM_DEFS.map((d) => [d.key, { enabled: true, code: d.defaultCode, sections: 1 }]),
      ) as Record<ALStreamKey, { enabled: boolean; code: string; sections: number }>,
  );

  // ── Step 4: Mediums ──────────────────────────────────────────────────────
  const SUGGESTED_MEDIUMS = ["Sinhala", "Tamil", "English"];
  const [mediumChecks, setMediumChecks] = useState<Record<string, boolean>>({
    Sinhala: true,
    Tamil: false,
    English: true,
  });
  const [customMediums, setCustomMediums] = useState<string[]>([]);
  const [mediumsSkipped, setMediumsSkipped] = useState(false);

  // ── Final submission (Step 5) ───────────────────────────────────────────
  // Nothing above this point has touched the database — Steps 0-4 are pure
  // local-state navigation, freely back-and-forward-able. Everything is
  // written here, once, in dependency order.
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const progressRef = useRef<SubmitProgress>({
    school: false,
    houses: false,
    grades: null,
    classes: false,
    mediums: false,
  });

  const submitAll = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const progress = progressRef.current;

    try {
      if (!progress.school) {
        await createSchool.mutateAsync({
          name: school.name.trim(),
          address: school.address.trim(),
          phone: school.phone.trim(),
          email: school.email.trim(),
          logo_url: school.logo_url || undefined,
          grade_from: school.grade_from === "" ? null : Number(school.grade_from),
          grade_to: school.grade_to === "" ? null : Number(school.grade_to),
        });
        progress.school = true;
      }

      if (!progress.houses) {
        if (!housesSkipped) {
          const named = houses.filter((h) => h.name.trim());
          for (let i = 0; i < named.length; i++) {
            await createHouse.mutateAsync({
              name: named[i].name.trim(),
              code: named[i].code.trim() || undefined,
              remainder: i,
            });
          }
        }
        progress.houses = true;
      }

      if (!progress.grades) {
        const created: Grade[] = [];
        for (let i = 0; i < orderedSelectedGrades.length; i++) {
          const g = await createGrade.mutateAsync({
            name: `Grade ${orderedSelectedGrades[i]}`,
            sort_order: i,
          });
          created.push(g);
        }
        progress.grades = created;
      }
      const createdGrades = progress.grades;

      if (!progress.classes) {
        if (!classesSkipped && yearLabel.trim() && createdGrades.length > 0) {
          const regularGrades = createdGrades.filter((g) => !AL_GRADE_NUMBERS.has(Number(g.name.replace(/\D/g, ""))));
          const alGrades = createdGrades.filter((g) => AL_GRADE_NUMBERS.has(Number(g.name.replace(/\D/g, ""))));

          const year = await createAcademicYear.mutateAsync({
            label: yearLabel.trim(),
            start_date: new Date(now.getFullYear(), 0, 1).toISOString(),
            end_date: new Date(now.getFullYear(), 11, 31).toISOString(),
            is_current: true,
          });

          for (const grade of regularGrades) {
            const gradeNumber = Number(grade.name.replace(/\D/g, ""));
            const count = sectionsPerGrade[gradeNumber] ?? 1;
            for (let i = 0; i < count; i++) {
              const section = String.fromCharCode(65 + i);
              await createClass.mutateAsync({
                grade_id: grade.id,
                academic_year_id: year.id,
                name: `${gradeNumber}-${section}`,
              });
            }
          }

          if (alGrades.length > 0) {
            const enabledDefs = AL_STREAM_DEFS.filter((d) => alStreams[d.key].enabled);
            const streamIdByName = new Map<string, string>();
            const groupIdByKey = new Map<ALStreamKey, string>();

            for (const def of enabledDefs) {
              if (!streamIdByName.has(def.streamName)) {
                const stream = await createStream.mutateAsync({ name: def.streamName });
                streamIdByName.set(def.streamName, stream.id);
              }
              if (def.groupName) {
                const group = await createStreamGroup.mutateAsync({
                  streamId: streamIdByName.get(def.streamName)!,
                  data: { name: def.groupName },
                });
                groupIdByKey.set(def.key, group.id);
              }
            }

            for (const grade of alGrades) {
              const gradeNumber = Number(grade.name.replace(/\D/g, ""));
              for (const def of enabledDefs) {
                const config = alStreams[def.key];
                const code = config.code.trim() || def.defaultCode;
                for (let i = 0; i < config.sections; i++) {
                  await createClass.mutateAsync({
                    grade_id: grade.id,
                    academic_year_id: year.id,
                    stream_id: streamIdByName.get(def.streamName)!,
                    stream_group_id: def.groupName ? groupIdByKey.get(def.key) ?? null : null,
                    name: `${gradeNumber}-${code}${i + 1}`,
                  });
                }
              }
            }
          }
        }
        progress.classes = true;
      }

      if (!progress.mediums) {
        if (!mediumsSkipped) {
          const names = [
            ...SUGGESTED_MEDIUMS.filter((m) => mediumChecks[m]),
            ...customMediums.filter((m) => m.trim()),
          ];
          for (const name of names) {
            await createMedium.mutateAsync({ name });
          }
        }
        progress.mediums = true;
      }

      setSubmitted(true);
    } catch (e) {
      setSubmitError(getErrorMessage(e, "Failed to save your school setup. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSchoolNext = () => {
    setSchoolTouched(true);
    if (!schoolValid) return;
    setError(null);
    goNext();
  };

  const handleHousesNext = (skip: boolean) => {
    setHousesSkipped(skip);
    goNext();
  };

  const handleGradesNext = () => {
    setError(null);
    if (selectedGrades.size === 0) {
      setError("Select at least one grade.");
      return;
    }
    goNext();
  };

  const handleClassesNext = (skip: boolean) => {
    setError(null);
    if (!skip && !yearLabel.trim()) {
      setError("An academic year label is required.");
      return;
    }
    setClassesSkipped(skip);
    goNext();
  };

  const handleMediumsNext = (skip: boolean) => {
    setMediumsSkipped(skip);
    goNext();
    submitAll();
  };

  return (
    <div className="os-signin-wrapper" style={{ alignItems: "flex-start", paddingTop: "3rem" }}>
      <div className="os-setup-card" style={{ maxWidth: "42rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
          <img src="/favicon.webp" alt="" width={44} height={44} style={{ display: "block", flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#161616" }}>
              Set Up Your School
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>
              A few steps to get OpenSchool ready - you can change any of this later.
            </p>
          </div>
        </div>

        <ProgressIndicator currentIndex={step} spaceEqually style={{ marginBottom: "0.5rem" }}>
          {STEPS.map((label) => (
            <ProgressStep key={label} label={label} translateWithId={silentProgressStatus} />
          ))}
        </ProgressIndicator>
        <p style={{ margin: "0 0 1.75rem", fontSize: "0.75rem", color: "#8d8d8d", textAlign: "right" }}>
          Step {step + 1} of {STEPS.length}
        </p>

        {error && (
          <InlineNotification
            kind="error"
            title="Could not continue"
            subtitle={error}
            hideCloseButton
            lowContrast
            style={{ marginBottom: "1rem", maxWidth: "100%" }}
          />
        )}

        {/* ── Step 0: School ─────────────────────────────────────────── */}
        {step === 0 && (
          <StepShell icon={Enterprise} title="School details" subtitle="The basics - you can fill in the rest later from Settings.">
            <div style={{ display: "grid", gap: "1rem" }}>
              <TextInput
                id="ss-name"
                labelText="School Name"
                placeholder="e.g. Royal College"
                value={school.name}
                onChange={(e) => setSchool((s) => ({ ...s, name: e.target.value }))}
                invalid={schoolTouched && !school.name.trim()}
                invalidText="School name is required."
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <TextInput
                  id="ss-phone"
                  labelText="Phone"
                  value={school.phone}
                  onChange={(e) => setSchool((s) => ({ ...s, phone: e.target.value }))}
                  invalid={schoolTouched && !school.phone.trim()}
                  invalidText="Phone number is required."
                />
                <TextInput
                  id="ss-email"
                  labelText="Email"
                  type="email"
                  value={school.email}
                  onChange={(e) => setSchool((s) => ({ ...s, email: e.target.value }))}
                  invalid={schoolTouched && !EMAIL_RE.test(school.email.trim())}
                  invalidText="Enter a valid email address."
                />
              </div>
              <TextInput
                id="ss-address"
                labelText="Address"
                value={school.address}
                onChange={(e) => setSchool((s) => ({ ...s, address: e.target.value }))}
                invalid={schoolTouched && !school.address.trim()}
                invalidText="Address is required."
              />
              <LogoUpload
                value={school.logo_url}
                editing
                onChange={(v) => setSchool((s) => ({ ...s, logo_url: v }))}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <NumberInput
                  id="ss-grade-from"
                  label="Lowest grade"
                  min={GRADE_MIN}
                  max={GRADE_MAX}
                  value={school.grade_from}
                  onChange={(_e, { value }) =>
                    setSchool((s) => ({ ...s, grade_from: value === "" ? "" : Number(value) }))
                  }
                />
                <NumberInput
                  id="ss-grade-to"
                  label="Highest grade"
                  min={GRADE_MIN}
                  max={GRADE_MAX}
                  invalid={gradeRangeInvalid}
                  invalidText="Must be ≥ lowest grade."
                  value={school.grade_to}
                  onChange={(_e, { value }) =>
                    setSchool((s) => ({ ...s, grade_to: value === "" ? "" : Number(value) }))
                  }
                />
              </div>
            </div>
          </StepShell>
        )}

        {/* ── Step 1: Houses ─────────────────────────────────────────── */}
        {step === 1 && (
          <StepShell icon={Home} title="Houses" subtitle="Optional - students are auto-assigned a house by index number.">
            {houses.map((h, i) => (
              <RepeatableRow
                key={i}
                onRemove={() => setHouses((hs) => hs.filter((_, idx) => idx !== i))}
              >
                <TextInput
                  id={`house-name-${i}`}
                  labelText="Name"
                  placeholder="e.g. Vijaya"
                  size="md"
                  value={h.name}
                  onChange={(e) =>
                    setHouses((hs) => hs.map((row, idx) => (idx === i ? { ...row, name: e.target.value } : row)))
                  }
                />
                <TextInput
                  id={`house-code-${i}`}
                  labelText="Code (optional)"
                  placeholder="e.g. VJ"
                  size="md"
                  value={h.code}
                  onChange={(e) =>
                    setHouses((hs) => hs.map((row, idx) => (idx === i ? { ...row, code: e.target.value } : row)))
                  }
                />
              </RepeatableRow>
            ))}
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Add}
              onClick={() => setHouses((hs) => [...hs, { name: "", code: "" }])}
            >
              Add another house
            </Button>
          </StepShell>
        )}

        {/* ── Step 2: Grades ─────────────────────────────────────────── */}
        {step === 2 && (
          <StepShell icon={Education} title="Grades" subtitle="Pre-selected from the range you set. Uncheck any that don't apply.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
              {Array.from({ length: gradeRangeEnd - gradeRangeStart + 1 }, (_, i) => i + gradeRangeStart).map((n) => (
                <Checkbox
                  key={n}
                  id={`grade-${n}`}
                  labelText={`Grade ${n}`}
                  checked={selectedGrades.has(n)}
                  onChange={(_e, { checked }) =>
                    setSelectedGrades((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(n);
                      else next.delete(n);
                      return next;
                    })
                  }
                />
              ))}
            </div>
          </StepShell>
        )}

        {/* ── Step 3: Classes ────────────────────────────────────────── */}
        {step === 3 && (
          <StepShell
            icon={Building}
            title="Classes"
            subtitle="Sections are auto-named (10-A, 10-B, …); Grade 12/13 use A/L streams instead (12-M1, 12-C1, …)."
          >
            <TextInput
              id="ss-year-label"
              labelText="Academic Year Label"
              value={yearLabel}
              onChange={(e) => setYearLabel(e.target.value)}
              style={{ marginBottom: "1.25rem" }}
            />
            {orderedSelectedGrades.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "#8d8d8d" }}>
                No grades were selected in the previous step, so there's nothing to add classes to yet.
              </p>
            ) : (
              <>
                {regularGradeNumbers.length > 0 && (
                  <div style={{ display: "grid", gap: "0.75rem", marginBottom: alGradeNumbers.length > 0 ? "1.75rem" : 0 }}>
                    {regularGradeNumbers.map((gradeNumber) => (
                      <div
                        key={gradeNumber}
                        style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4" }}
                      >
                        <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500, color: "#161616" }}>Grade {gradeNumber}</span>
                        <NumberInput
                          id={`sections-${gradeNumber}`}
                          label="Sections"
                          size="sm"
                          min={0}
                          max={10}
                          value={sectionsPerGrade[gradeNumber] ?? 1}
                          onChange={(_e, { value }) =>
                            setSectionsPerGrade((prev) => ({ ...prev, [gradeNumber]: value === "" ? 0 : Number(value) }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {alGradeNumbers.length > 0 && (
                  <div>
                    <p style={{ margin: "0 0 0.25rem", fontSize: "0.8125rem", fontWeight: 600, color: "#161616" }}>
                      A/L Streams - {alGradeNumbers.map((n) => `Grade ${n}`).join(" & ")}
                    </p>
                    <p style={{ margin: "0 0 0.875rem", fontSize: "0.75rem", color: "#8d8d8d" }}>
                      Applied to both A/L grades. Uncheck streams your school doesn't offer, and adjust the code and
                      section count for each.
                    </p>
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {AL_STREAM_DEFS.map((def) => {
                        const cfg = alStreams[def.key];
                        return (
                          <div
                            key={def.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              padding: "0.5rem 0.25rem",
                              borderBottom: "1px solid #f4f4f4",
                              opacity: cfg.enabled ? 1 : 0.5,
                            }}
                          >
                            <Checkbox
                              id={`al-${def.key}`}
                              labelText={def.label}
                              checked={cfg.enabled}
                              onChange={(_e, { checked }) =>
                                setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], enabled: checked } }))
                              }
                            />
                            <div style={{ flex: 1 }} />
                            <TextInput
                              id={`al-code-${def.key}`}
                              labelText="Code"
                              size="sm"
                              maxLength={3}
                              disabled={!cfg.enabled}
                              value={cfg.code}
                              style={{ width: "5rem" }}
                              onChange={(e) =>
                                setAlStreams((prev) => ({ ...prev, [def.key]: { ...prev[def.key], code: e.target.value } }))
                              }
                            />
                            <NumberInput
                              id={`al-sections-${def.key}`}
                              label="Sections"
                              size="sm"
                              min={0}
                              max={10}
                              disabled={!cfg.enabled}
                              value={cfg.sections}
                              onChange={(_e, { value }) =>
                                setAlStreams((prev) => ({
                                  ...prev,
                                  [def.key]: { ...prev[def.key], sections: value === "" ? 0 : Number(value) },
                                }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", color: "#8d8d8d" }}>
                      Example: Physical Science with code "M" and 2 sections creates{" "}
                      {alGradeNumbers.map((n) => `${n}-M1, ${n}-M2`).join(", ")}.
                    </p>
                  </div>
                )}
              </>
            )}
          </StepShell>
        )}

        {/* ── Step 4: Mediums ────────────────────────────────────────── */}
        {step === 4 && (
          <StepShell icon={Language} title="Mediums" subtitle="Optional - languages of instruction, used later to restrict subjects.">
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
              {SUGGESTED_MEDIUMS.map((m) => (
                <Checkbox
                  key={m}
                  id={`medium-${m}`}
                  labelText={m}
                  checked={!!mediumChecks[m]}
                  onChange={(_e, { checked }) => setMediumChecks((prev) => ({ ...prev, [m]: checked }))}
                />
              ))}
            </div>
            {customMediums.map((m, i) => (
              <RepeatableRow key={i} onRemove={() => setCustomMediums((ms) => ms.filter((_, idx) => idx !== i))}>
                <TextInput
                  id={`custom-medium-${i}`}
                  labelText="Medium"
                  size="md"
                  value={m}
                  onChange={(e) =>
                    setCustomMediums((ms) => ms.map((row, idx) => (idx === i ? e.target.value : row)))
                  }
                />
              </RepeatableRow>
            ))}
            <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setCustomMediums((ms) => [...ms, ""])}>
              Add another medium
            </Button>
          </StepShell>
        )}

        {/* ── Step 5: Done ───────────────────────────────────────────── */}
        {step === 5 && (
          <div>
            {submitting && (
              <div style={{ display: "flex", justifyContent: "center", padding: "3.5rem 0" }}>
                <InlineLoading description="Saving your school setup…" />
              </div>
            )}

            {!submitting && submitError && (
              <div style={{ textAlign: "center" }}>
                <InlineNotification
                  kind="error"
                  title="Could not finish setup"
                  subtitle={submitError}
                  hideCloseButton
                  lowContrast
                  style={{ marginBottom: "1.25rem", maxWidth: "100%", textAlign: "left" }}
                />
                <Button onClick={submitAll} style={{ width: "100%", maxWidth: "100%" }}>
                  Retry
                </Button>
              </div>
            )}

            {!submitting && !submitError && submitted && (
              <>
                <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                  <div
                    style={{
                      width: "3.5rem",
                      height: "3.5rem",
                      margin: "0 auto 1rem",
                      borderRadius: "50%",
                      background: "#defbe6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckmarkFilled size={28} style={{ fill: "#24a148" }} />
                  </div>
                  <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.25rem", fontWeight: 600, color: "#161616" }}>
                    Your school is ready
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#525252" }}>
                    Here's what OpenSchool helps you run day to day, and where to go next.
                  </p>
                </div>

                <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  {[
                    {
                      title: "Curriculum",
                      body: "Define levels (a grade, a stream, an exam class) and selection groups to control which subjects students can pick.",
                      path: "/curriculum",
                      icon: Layers,
                    },
                    {
                      title: "Subjects",
                      body: "Build your subject catalogue, then offer subjects to students through curriculum selection groups.",
                      path: "/subjects",
                      icon: Book,
                    },
                    {
                      title: "Students & Teachers",
                      body: "Enrol students and add teachers - each gets their own sign-in and profile automatically.",
                      path: "/students",
                      icon: UserMultiple,
                    },
                    {
                      title: "Attendance",
                      body: "Once classes have students, teachers can create sessions and mark attendance from the class page.",
                      path: "/attendance",
                      icon: EventSchedule,
                    },
                  ].map((item) => (
                    <Link
                      key={item.title}
                      to={item.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                        padding: "0.875rem 1rem",
                        border: "1px solid #e0e0e0",
                        background: "#fafafa",
                        textDecoration: "none",
                        transition: "border-color 0.15s ease, background 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "2.25rem",
                          height: "2.25rem",
                          borderRadius: "50%",
                          background: "#edf2fa",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <item.icon size={18} style={{ fill: ACCENT }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", fontWeight: 600, color: "#161616" }}>
                          {item.title}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#525252" }}>{item.body}</p>
                      </div>
                      <ChevronRight size={16} style={{ fill: "#8d8d8d", flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>

                <Button
                  renderIcon={ArrowRight}
                  kind="primary"
                  onClick={() => navigate("/")}
                  style={{ width: "100%", maxWidth: "100%" }}
                >
                  Go to Dashboard
                </Button>
              </>
            )}
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────── */}
        {step < 5 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.75rem" }}>
            <Button kind="ghost" onClick={goBack} disabled={step === 0}>
              Back
            </Button>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(step === 1 || step === 3 || step === 4) && (
                <Button
                  kind="secondary"
                  onClick={() => {
                    if (step === 1) handleHousesNext(true);
                    else if (step === 3) handleClassesNext(true);
                    else handleMediumsNext(true);
                  }}
                >
                  Skip
                </Button>
              )}
              <Button
                kind="primary"
                onClick={() => {
                  if (step === 0) handleSchoolNext();
                  else if (step === 1) handleHousesNext(false);
                  else if (step === 2) handleGradesNext();
                  else if (step === 3) handleClassesNext(false);
                  else handleMediumsNext(false);
                }}
              >
                {step === 4 ? "Finish Setup" : "Continue"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
