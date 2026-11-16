import { useRef, useState } from "react";
import { useCreateSchool } from "@/features/school/queries/useSchool";
import { useCreateHouse } from "@/features/school/queries/useHouses";
import { useCreateGrade } from "@/features/academics/queries/useGrades";
import { useCreateAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCreateClass, useCreateStream, useCreateStreamGroup } from "@/features/academics/queries/useClasses";
import { useCreateMedium } from "@/features/curriculum/queries/useCurriculum";
import { useCreateClassroom } from "@/features/timetable/queries/useClassrooms";
import { getErrorMessage } from "@/shared/api/errors";
import { createSetupRequest } from "@/features/school/lib/setupRequest";
import { createClassesStep } from "@/features/school/lib/setupClasses";
import {
  createGradesStep,
  createHousesStep,
  createMediumsStep,
  createRoomsStep,
  createSchoolStep,
  newSubmitProgress,
  setupGradeNumbers,
  type SetupApi,
  type SetupContext,
  type SetupInput,
} from "@/features/school/lib/setupSteps";

export function useSchoolSetupSubmit(input: SetupInput) {
  const api: SetupApi = {
    createSchool: useCreateSchool().mutateAsync,
    createHouse: useCreateHouse().mutateAsync,
    createGrade: useCreateGrade().mutateAsync,
    createAcademicYear: useCreateAcademicYear().mutateAsync,
    createClass: useCreateClass().mutateAsync,
    createMedium: useCreateMedium().mutateAsync,
    createStream: useCreateStream().mutateAsync,
    createStreamGroup: useCreateStreamGroup().mutateAsync,
    createClassroom: useCreateClassroom().mutateAsync,
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const requestRef = useRef(createSetupRequest());
  const progressRef = useRef(newSubmitProgress());

  // skipRoomsOverride bypasses the Rooms step's stale roomsSkipped state, whose setState hasn't applied yet when it triggers submit.
  const submitAll = async (skipRoomsOverride?: boolean) => {
    const ctx: SetupContext = { api, request: requestRef.current, progress: progressRef.current };
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createSchoolStep(ctx, input.school);
      if (!input.housesSkipped) await createHousesStep(ctx, input.houses);
      const grades = await createGradesStep(ctx, setupGradeNumbers(input.school, input.orderedSelectedGrades));
      // Mediums come before classes so each section can be tagged with its language of instruction.
      const mediums = await createMediumsStep(ctx, input);
      await createClassesStep(ctx, input, grades, mediums);
      if (!(skipRoomsOverride ?? input.roomsSkipped)) await createRoomsStep(ctx, input.facilityRooms);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(getErrorMessage(e, "Failed to save your school setup. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, submitError, submitted, submitAll };
}
