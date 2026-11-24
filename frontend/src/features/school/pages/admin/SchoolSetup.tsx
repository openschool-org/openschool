import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { Alert, Button, Card, Steps, Tag } from "antd";
import { useSchool } from "@/features/school/queries/useSchool";
import SchoolStep from "@/features/school/components/setup/SchoolStep";
import HousesStep from "@/features/school/components/setup/HousesStep";
import GradesStep from "@/features/school/components/setup/GradesStep";
import MediumsStep from "@/features/school/components/setup/MediumsStep";
import ClassesStep from "@/features/school/components/setup/ClassesStep";
import RoomsStep from "@/features/school/components/setup/RoomsStep";
import ReviewStep from "@/features/school/components/setup/ReviewStep";
import DoneStep from "@/features/school/components/setup/DoneStep";
import { useSchoolSetupSubmit } from "@/features/school/hooks/useSchoolSetupSubmit";
import { useSchoolSetupState } from "@/features/school/hooks/useSchoolSetupState";
import { STEPS, STEP_INFO, type StepName } from "@/features/school/setupConstants";
import ErrorSummary from "@/shared/ui/ErrorSummary";
import { useErrorSummary } from "@/shared/hooks/useErrorSummary";

type FormStep = Exclude<StepName, "Done">;
const FORM_STEPS = STEPS.filter((name): name is FormStep => name !== "Done");
const DONE_STEP = STEPS.indexOf("Done");

export default function SchoolSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [housesValidationAttempted, setHousesValidationAttempted] = useState(false);
  const { data: existingSchool, isLoading: schoolCheckLoading } = useSchool();
  const s = useSchoolSetupState();
  const { submitting, submitError, submitted, submitAll } = useSchoolSetupSubmit(s);
  const { ref: summaryRef, errors: summaryErrors, reveal, recheck, reset: resetSummary } = useErrorSummary();

  const goTo = (index: number) => {
    resetSummary();
    setError(null);
    setStep(Math.max(0, Math.min(index, DONE_STEP)));
  };

  // Each step validates itself before moving on; skip bypasses that step's input.
  const advance = (skip: boolean) => {
    setError(null);
    switch (STEPS[step]) {
      case "School":
        if (!reveal(() => s.setSchoolTouched(true)) || !s.schoolValid) return;
        break;
      case "Houses":
        if (!skip) setHousesValidationAttempted(true);
        if (!skip && s.houses.some((house) => house.name.trim() && !house.code.trim())) {
          return setError("Every house with a name needs a code.");
        }
        s.setHousesSkipped(skip);
        break;
      case "Grades":
        if (s.selectedGrades.size === 0) return setError("Select at least one grade.");
        break;
      case "Mediums":
        s.setMediumsSkipped(skip);
        break;
      case "Classes":
        if (!skip && !s.yearLabel.trim()) return setError("Enter the academic year.");
        if (!skip && (!Number.isFinite(s.classCapacity) || s.classCapacity < 1 || s.classCapacity > 200)) {
          return setError("Class capacity must be between 1 and 200.");
        }
        s.setClassesSkipped(skip);
        break;
      case "Rooms":
        s.setRoomsSkipped(skip);
        break;
      case "Review":
        goTo(DONE_STEP);
        submitAll();
        return;
    }
    goTo(step + 1);
  };

  if (!schoolCheckLoading && existingSchool && !submitted && !submitting) return <Navigate to="/" replace />;

  const current = STEPS[step];
  const info = current === "Done" ? null : STEP_INFO[current];

  return (
    <div className="os-setup-wizard">
      <header className="os-setup-wizard__bar">
        <div className="os-setup-wizard__brand">
          <img src="/favicon.webp" alt="" width={28} height={28} />
          <span className="os-setup-wizard__product">OpenSchool</span>
          <span className="os-setup-wizard__context">School setup</span>
        </div>
        {info && <span className="os-setup-wizard__count">Step {step + 1} of {FORM_STEPS.length}</span>}
      </header>

      {!info ? (
        <main className="os-setup-wizard__done">
          <DoneStep submitting={submitting} submitError={submitError} submitted={submitted} onRetry={() => submitAll()} onBack={() => goTo(DONE_STEP - 1)} onGoToDashboard={() => navigate("/")} />
        </main>
      ) : (
        <main className="os-setup-wizard__body">
          <aside className="os-setup-wizard__rail">
            <h1>Set up your school</h1>
            <p>Seven short steps. Nothing is saved until you confirm on the last one.</p>
            <Steps
              orientation="vertical"
              size="small"
              current={step}
              onChange={(index) => index < step && goTo(index)}
              items={FORM_STEPS.map((name, index) => ({
                title: (
                  <span className="os-setup-wizard__step">
                    {STEP_INFO[name].title}
                    {STEP_INFO[name].optional && <Tag className="os-setup-wizard__optional">Optional</Tag>}
                  </span>
                ),
                disabled: index > step,
              }))}
            />
          </aside>

          <Card
            className="os-setup-wizard__card"
            title={info.title}
            extra={info.optional ? <Tag className="os-setup-wizard__optional">Optional</Tag> : null}
          >
            <p className="os-setup-wizard__description">{info.description}</p>
            {error && <Alert type="error" showIcon title={error} className="os-mb-4" />}
            <ErrorSummary errors={summaryErrors} />

            <div ref={summaryRef} onChange={recheck}>
              {current === "School" && <SchoolStep school={s.school} setSchool={s.setSchool} schoolTouched={s.schoolTouched} gradeRangeInvalid={s.gradeRangeInvalid} />}
              {current === "Houses" && <HousesStep houses={s.houses} setHouses={s.setHouses} validationAttempted={housesValidationAttempted} />}
              {current === "Grades" && <GradesStep gradeRangeStart={s.gradeRangeStart} gradeRangeEnd={s.gradeRangeEnd} selectedGrades={s.selectedGrades} setSelectedGrades={s.setSelectedGrades} />}
              {current === "Mediums" && <MediumsStep mediumChecks={s.mediumChecks} setMediumChecks={s.setMediumChecks} customMediums={s.customMediums} setCustomMediums={s.setCustomMediums} />}
              {current === "Classes" && <ClassesStep state={s} />}
              {current === "Rooms" && <RoomsStep facilityRooms={s.facilityRooms} setFacilityRooms={s.setFacilityRooms} />}
              {current === "Review" && <ReviewStep state={s} onEdit={(name) => goTo(STEPS.indexOf(name))} />}
            </div>

            <div className="os-setup-wizard__actions">
              <Button size="large" onClick={() => goTo(step - 1)} disabled={step === 0}>Back</Button>
              <div className="os-setup-wizard__actions-right">
                {info.optional && <Button size="large" type="text" onClick={() => advance(true)}>Skip this step</Button>}
                <Button type="primary" size="large" onClick={() => advance(false)}>
                  {current === "Review" ? "Create school" : "Continue"}
                </Button>
              </div>
            </div>
          </Card>
        </main>
      )}
    </div>
  );
}
