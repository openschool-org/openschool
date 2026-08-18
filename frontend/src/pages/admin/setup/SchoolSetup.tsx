// This file renders the wizard interface for the initial school setup, allowing administrators to configure basic school details, houses, grades, mediums, and classes.

import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { Button, InlineNotification } from "@carbon/react";
import { useSchool } from "../../../queries/useSchool";
import { isValidSriLankanPhone } from "../../../lib/phone";
import SchoolStep from "./components/SchoolStep";
import HousesStep, { type HouseRow } from "./components/HousesStep";
import GradesStep from "./components/GradesStep";
import MediumsStep from "./components/MediumsStep";
import ClassesStep from "./components/ClassesStep";
import DoneStep from "./components/DoneStep";
import CustomStepper from "./components/CustomStepper";
import { useSchoolSetupSubmit } from "./hooks/useSchoolSetupSubmit";
import {
  AL_GRADE_NUMBERS,
  AL_STREAM_DEFS,
  GRADE_MIN,
  GRADE_MAX,
  EMAIL_RE,
  STEPS,
  HOUSE_COLOR_PALETTE,
  SUGGESTED_MEDIUMS,
  type ALStreamKey,
  type AlStreamsState,
} from "./constants";

const DONE_STEP = STEPS.length - 1;
const LAST_INPUT_STEP = DONE_STEP - 1;

export default function SchoolSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data: existingSchool, isLoading: schoolCheckLoading } = useSchool();

  const [school, setSchool] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    school_type: "mixed" as "boys" | "girls" | "mixed",
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
    isValidSriLankanPhone(school.phone) &&
    school.phone.trim().length > 0 &&
    EMAIL_RE.test(school.email.trim()) &&
    school.address.trim().length > 0 &&
    !gradeRangeInvalid;

  const [houses, setHouses] = useState<HouseRow[]>([{ name: "", code: "", color: HOUSE_COLOR_PALETTE[0] }]);
  const [housesSkipped, setHousesSkipped] = useState(false);

  const gradeRangeStart = school.grade_from === "" ? GRADE_MIN : Number(school.grade_from);
  const gradeRangeEnd = school.grade_to === "" ? GRADE_MAX : Number(school.grade_to);

  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set());

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

  const [mediumChecks, setMediumChecks] = useState<Record<string, boolean>>({
    Sinhala: true,
    Tamil: false,
    English: true,
  });
  const [customMediums, setCustomMediums] = useState<string[]>([]);
  const [mediumsSkipped, setMediumsSkipped] = useState(false);

  const selectedMediumNames = mediumsSkipped
    ? []
    : [...SUGGESTED_MEDIUMS.filter((m) => mediumChecks[m]), ...customMediums.filter((m) => m.trim())];

  const [yearLabel, setYearLabel] = useState(String(new Date().getFullYear()));
  const [sectionsPerGrade, setSectionsPerGrade] = useState<Record<number, number>>({});
  const [classesSkipped, setClassesSkipped] = useState(false);
  const [sectionMediums, setSectionMediums] = useState<Record<string, string>>({});

  const [alStreams, setAlStreams] = useState<AlStreamsState>(
    () =>
      Object.fromEntries(
        AL_STREAM_DEFS.map((d) => [d.key, { enabled: true, code: d.defaultCode, sections: 1 }]),
      ) as Record<ALStreamKey, { enabled: boolean; code: string; sections: number }>,
  );

  const { submitting, submitError, submitted, submitAll } = useSchoolSetupSubmit({
    school,
    houses,
    housesSkipped,
    orderedSelectedGrades,
    mediumsSkipped,
    mediumChecks,
    customMediums,
    yearLabel,
    sectionsPerGrade,
    sectionMediums,
    alStreams,
    classesSkipped,
  });

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

  const handleMediumsNext = (skip: boolean) => {
    setMediumsSkipped(skip);
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
    submitAll(skip);
  };

  if (!schoolCheckLoading && existingSchool && !submitted && !submitting) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="os-signin-wrapper" style={{ alignItems: "flex-start", paddingTop: "0.5rem" }}>
      <div className="os-setup-card" style={{ maxWidth: "42rem", marginTop: "0.5rem" }}>
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

        <CustomStepper currentIndex={step} steps={STEPS} />

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

        {step === 0 && (
          <SchoolStep
            school={school}
            setSchool={setSchool}
            schoolTouched={schoolTouched}
            gradeRangeInvalid={gradeRangeInvalid}
          />
        )}

        {step === 1 && <HousesStep houses={houses} setHouses={setHouses} />}

        {step === 2 && (
          <GradesStep
            gradeRangeStart={gradeRangeStart}
            gradeRangeEnd={gradeRangeEnd}
            selectedGrades={selectedGrades}
            setSelectedGrades={setSelectedGrades}
          />
        )}

        {step === 3 && (
          <MediumsStep
            mediumChecks={mediumChecks}
            setMediumChecks={setMediumChecks}
            customMediums={customMediums}
            setCustomMediums={setCustomMediums}
          />
        )}

        {step === LAST_INPUT_STEP && (
          <ClassesStep
            yearLabel={yearLabel}
            setYearLabel={setYearLabel}
            orderedSelectedGrades={orderedSelectedGrades}
            regularGradeNumbers={regularGradeNumbers}
            alGradeNumbers={alGradeNumbers}
            sectionsPerGrade={sectionsPerGrade}
            setSectionsPerGrade={setSectionsPerGrade}
            selectedMediumNames={selectedMediumNames}
            sectionMediums={sectionMediums}
            setSectionMediums={setSectionMediums}
            alStreams={alStreams}
            setAlStreams={setAlStreams}
          />
        )}

        {step === DONE_STEP && (
          <DoneStep
            submitting={submitting}
            submitError={submitError}
            submitted={submitted}
            onRetry={() => submitAll()}
            onGoToDashboard={() => navigate("/")}
          />
        )}

        {step < DONE_STEP && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.75rem" }}>
            <Button kind="ghost" onClick={goBack} disabled={step === 0}>
              Back
            </Button>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(step === 1 || step === 3 || step === LAST_INPUT_STEP) && (
                <Button
                  kind="secondary"
                  onClick={() => {
                    if (step === 1) handleHousesNext(true);
                    else if (step === 3) handleMediumsNext(true);
                    else handleClassesNext(true);
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
                  else if (step === 3) handleMediumsNext(false);
                  else handleClassesNext(false);
                }}
              >
                {step === LAST_INPUT_STEP ? "Finish Setup" : "Continue"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
