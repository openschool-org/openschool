import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { Button, InlineNotification } from "@carbon/react";
import { useSchool } from "@/features/school/queries/useSchool";
import SchoolStep from "@/features/school/components/setup/SchoolStep";
import HousesStep from "@/features/school/components/setup/HousesStep";
import GradesStep from "@/features/school/components/setup/GradesStep";
import MediumsStep from "@/features/school/components/setup/MediumsStep";
import ClassesStep from "@/features/school/components/setup/ClassesStep";
import RoomsStep from "@/features/school/components/setup/RoomsStep";
import DoneStep from "@/features/school/components/setup/DoneStep";
import CustomStepper from "@/features/school/components/setup/CustomStepper";
import { useSchoolSetupSubmit } from "@/features/school/hooks/useSchoolSetupSubmit";
import { useSchoolSetupState } from "@/features/school/hooks/useSchoolSetupState";
import { STEPS } from "@/features/school/setupConstants";
import ErrorSummary from "@/shared/ui/ErrorSummary";
import { useErrorSummary } from "@/shared/hooks/useErrorSummary";

const DONE_STEP = STEPS.length - 1;
const CLASSES_STEP = STEPS.indexOf("Classes");
const ROOMS_STEP = DONE_STEP - 1;
const SKIPPABLE = new Set([1, 3, CLASSES_STEP, ROOMS_STEP]);

export default function SchoolSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { data: existingSchool, isLoading: schoolCheckLoading } = useSchool();
  const s = useSchoolSetupState();
  const { submitting, submitError, submitted, submitAll } = useSchoolSetupSubmit(s);
  const { ref: summaryRef, errors: summaryErrors, reveal, recheck, reset: resetSummary } = useErrorSummary();

  const goNext = () => {
    resetSummary();
    setStep((n) => Math.min(n + 1, DONE_STEP));
  };
  const goBack = () => {
    resetSummary();
    setStep((n) => Math.max(n - 1, 0));
  };

  // Each step validates itself before moving on; skip bypasses that step's input.
  const advance = (skip: boolean) => {
    setError(null);
    switch (step) {
      case 0:
        if (!reveal(() => s.setSchoolTouched(true)) || !s.schoolValid) return;
        break;
      case 1:
        s.setHousesSkipped(skip);
        break;
      case 2:
        if (s.selectedGrades.size === 0) return setError("Select at least one grade.");
        break;
      case 3:
        s.setMediumsSkipped(skip);
        break;
      case CLASSES_STEP:
        if (!skip && !s.yearLabel.trim()) return setError("An academic year label is required.");
        s.setClassesSkipped(skip);
        break;
      default:
        s.setRoomsSkipped(skip);
        goNext();
        submitAll(skip);
        return;
    }
    goNext();
  };

  if (!schoolCheckLoading && existingSchool && !submitted && !submitting) return <Navigate to="/" replace />;

  return (
    <div className="os-school-setup-page">
      <img src="/favicon.webp" alt="OpenSchool" width={32} height={32} className="os-school-setup-corner-logo" />
      <div className="os-school-setup-card">
        <h1 className="os-school-setup-title">School onboarding</h1>
        <CustomStepper currentIndex={step} steps={STEPS} />

        {error && <InlineNotification kind="error" title="Could not continue" subtitle={error} hideCloseButton lowContrast className="os-school-setup-error" />}

        <ErrorSummary errors={summaryErrors} />

        <div ref={summaryRef} onChange={recheck}>
        {step === 0 && <SchoolStep school={s.school} setSchool={s.setSchool} schoolTouched={s.schoolTouched} gradeRangeInvalid={s.gradeRangeInvalid} />}
        {step === 1 && <HousesStep houses={s.houses} setHouses={s.setHouses} />}
        {step === 2 && <GradesStep gradeRangeStart={s.gradeRangeStart} gradeRangeEnd={s.gradeRangeEnd} selectedGrades={s.selectedGrades} setSelectedGrades={s.setSelectedGrades} />}
        {step === 3 && <MediumsStep mediumChecks={s.mediumChecks} setMediumChecks={s.setMediumChecks} customMediums={s.customMediums} setCustomMediums={s.setCustomMediums} />}
        {step === CLASSES_STEP && (
          <ClassesStep
            yearLabel={s.yearLabel}
            setYearLabel={s.setYearLabel}
            orderedSelectedGrades={s.orderedSelectedGrades}
            regularGradeNumbers={s.regularGradeNumbers}
            alGradeNumbers={s.alGradeNumbers}
            sectionsPerGrade={s.sectionsPerGrade}
            setSectionsPerGrade={s.setSectionsPerGrade}
            selectedMediumNames={s.selectedMediumNames}
            sectionMediums={s.sectionMediums}
            setSectionMediums={s.setSectionMediums}
            alStreams={s.alStreams}
            setAlStreams={s.setAlStreams}
          />
        )}
        {step === ROOMS_STEP && <RoomsStep roomChecks={s.roomChecks} setRoomChecks={s.setRoomChecks} customRooms={s.customRooms} setCustomRooms={s.setCustomRooms} />}
        </div>
        {step === DONE_STEP && <DoneStep submitting={submitting} submitError={submitError} submitted={submitted} onRetry={() => submitAll()} onGoToDashboard={() => navigate("/")} />}

        {step < DONE_STEP && (
          <div className="os-school-setup-actions">
            <Button kind="ghost" onClick={goBack} disabled={step === 0}>Back</Button>
            <div className="os-school-setup-actions__right">
              {SKIPPABLE.has(step) && <Button kind="secondary" onClick={() => advance(true)}>Skip</Button>}
              <Button kind="primary" onClick={() => advance(false)}>{step === ROOMS_STEP ? "Finish setup" : "Continue"}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
