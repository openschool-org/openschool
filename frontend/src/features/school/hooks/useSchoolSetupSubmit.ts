/* eslint-disable max-lines */
import { useRef, useState } from "react";
import { useCreateSchool } from "@/features/school/queries/useSchool";
import { useCreateHouse } from "@/features/school/queries/useHouses";
import { useCreateGrade } from "@/features/academics/queries/useGrades";
import { useCreateAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCreateClass, useCreateStream, useCreateStreamGroup } from "@/features/academics/queries/useClasses";
import { useCreateMedium } from "@/features/curriculum/queries/useCurriculum";
import { useCreateClassroom } from "@/features/timetable/queries/useClassrooms";
import { getErrorMessage } from "@/shared/api/errors";
import type { Grade } from "@/features/academics/api/grade";
import { AL_STREAM_DEFS, AL_GRADE_NUMBERS, SUGGESTED_MEDIUMS, type ALStreamKey, type AlStreamsByGradeState, type SchoolFormState, type FacilityRoom } from "@/features/school/setupConstants";
import type { HouseRow } from "@/features/school/components/setup/HousesStep";

// Tracks which submission phases already succeeded, so Retry after a mid-sequence failure resumes instead of duplicating them.
interface SubmitProgress {
  school: boolean;
  houses: boolean;
  grades: Grade[] | null;
  // Created medium ids keyed by name, reused on retry instead of recreated.
  mediums: Map<string, string> | null;
  classes: boolean;
  rooms: boolean;
}

interface Input {
  school: SchoolFormState;
  houses: HouseRow[];
  housesSkipped: boolean;
  orderedSelectedGrades: number[];
  mediumsSkipped: boolean;
  mediumChecks: Record<string, boolean>;
  customMediums: string[];
  selectedMediumNames: string[];
  yearLabel: string;
  classCapacity: number;
  sectionsPerGrade: Record<number, number>;
  sectionMediums: Record<string, string>;
  alStreams: AlStreamsByGradeState;
  classesSkipped: boolean;
  roomsSkipped: boolean;
  facilityRooms: FacilityRoom[];
}

// Grades here are always named "Grade N" (see the createGrade call below), so this recovers N.
const gradeNumberOf = (grade: Grade) => Number(grade.name.replace(/\D/g, ""));

export function useSchoolSetupSubmit(input: Input) {
  const createSchool = useCreateSchool();
  const createHouse = useCreateHouse();
  const createGrade = useCreateGrade();
  const createAcademicYear = useCreateAcademicYear();
  const createClass = useCreateClass();
  const createMedium = useCreateMedium();
  const createStream = useCreateStream();
  const createStreamGroup = useCreateStreamGroup();
  const createClassroom = useCreateClassroom();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const lastSetupRequestAt = useRef(0);
  const progressRef = useRef<SubmitProgress>({
    school: false,
    houses: false,
    grades: null,
    mediums: null,
    classes: false,
    rooms: false,
  });

  // Keep the long setup sequence below the API-wide token bucket. This also
  // retries a short-lived 429 so later streams are not skipped in large setups.
  const setupRequest = async <T,>(operation: () => Promise<T>): Promise<T> => {
    const interval = 40;
    const wait = Math.max(0, interval - (Date.now() - lastSetupRequestAt.current));
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastSetupRequestAt.current = Date.now();
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 429 || attempt >= 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        lastSetupRequestAt.current = Date.now();
      }
    }
  };

  // skipRoomsOverride bypasses the Rooms step's stale roomsSkipped state, whose setState hasn't applied yet when it triggers submit.
  const submitAll = async (skipRoomsOverride?: boolean) => {
    const {
      school,
      houses,
      housesSkipped,
      orderedSelectedGrades,
      mediumsSkipped,
      mediumChecks,
      customMediums,
      selectedMediumNames,
      yearLabel,
      classCapacity,
      sectionsPerGrade,
      sectionMediums,
      alStreams,
      classesSkipped,
      roomsSkipped,
      facilityRooms,
    } = input;
    const now = new Date();
    const skipClasses = classesSkipped;
    const skipRooms = skipRoomsOverride ?? roomsSkipped;
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
          school_type: school.school_type,
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
              color: named[i].color,
            });
          }
        }
        progress.houses = true;
      }

      const setupGradeNumbers = new Set(orderedSelectedGrades);
      const rangeIncludes12 = school.grade_from !== "" && school.grade_to !== "" && Number(school.grade_from) <= 12 && Number(school.grade_to) >= 12;
      const rangeIncludes13 = school.grade_from !== "" && school.grade_to !== "" && Number(school.grade_from) <= 13 && Number(school.grade_to) >= 13;
      if ((setupGradeNumbers.has(12) || setupGradeNumbers.has(13)) && rangeIncludes12 && rangeIncludes13) {
        setupGradeNumbers.add(12);
        setupGradeNumbers.add(13);
      }
      const normalizedSelectedGrades = [...setupGradeNumbers].sort((a, b) => a - b);

      if (!progress.grades) {
        const created: Grade[] = [];
        for (let i = 0; i < normalizedSelectedGrades.length; i++) {
          const g = await createGrade.mutateAsync({
            name: `Grade ${normalizedSelectedGrades[i]}`,
            sort_order: i,
          });
          created.push(g);
        }
        progress.grades = created;
      }
      const createdGrades = progress.grades;

      // Mediums are created before classes so each section can be tagged with its language of instruction.
      if (!progress.mediums) {
        const byName = new Map<string, string>();
        if (!mediumsSkipped) {
          const names = [
            ...SUGGESTED_MEDIUMS.filter((m) => mediumChecks[m]),
            ...customMediums.filter((m) => m.trim()),
          ];
          for (const name of names) {
            const medium = await createMedium.mutateAsync({ name });
            byName.set(name, medium.id);
          }
        }
        progress.mediums = byName;
      }
      const mediumIdByName = progress.mediums;

      if (!progress.classes) {
        if (!skipClasses && yearLabel.trim() && createdGrades.length > 0) {
          const regularGrades = createdGrades.filter((g) => !AL_GRADE_NUMBERS.has(gradeNumberOf(g)));
          const alGrades = createdGrades.filter((g) => AL_GRADE_NUMBERS.has(gradeNumberOf(g)));

          // Year from the admin's typed label (e.g. "2025"), not the real-world current year, since the setup may target a past/upcoming year.
          const labelYear = Number(yearLabel.trim().match(/\d{4}/)?.[0] ?? now.getFullYear());
          const year = await createAcademicYear.mutateAsync({
            label: yearLabel.trim(),
            // Date.UTC avoids the local Date constructor shifting Jan 1 to Dec 31 once converted to UTC in timezones ahead of it (e.g. Sri Lanka, UTC+5:30).
            start_date: new Date(Date.UTC(labelYear, 0, 1)).toISOString(),
            end_date: new Date(Date.UTC(labelYear, 11, 31)).toISOString(),
            is_current: true,
          });

          for (const grade of regularGrades) {
            const gradeNumber = gradeNumberOf(grade);
            const count = sectionsPerGrade[gradeNumber] ?? 1;
            for (let i = 0; i < count; i++) {
              const section = String.fromCharCode(65 + i);
              const mediumName = sectionMediums[`${gradeNumber}-${i}`] || selectedMediumNames[0];
              await setupRequest(() => createClass.mutateAsync({
                grade_id: grade.id,
                academic_year_id: year.id,
                name: `${gradeNumber}-${section}`,
                medium_id: (mediumName && mediumIdByName.get(mediumName)) || null,
                capacity: classCapacity,
              }));
            }
          }

          if (alGrades.length > 0) {
            const enabledDefs = AL_STREAM_DEFS.filter((d) => alGrades.some((grade) => alStreams[gradeNumberOf(grade)]?.[d.key]?.enabled));
            const streamIdByName = new Map<string, string>();
            const groupIdByKey = new Map<ALStreamKey, string>();

            for (const def of enabledDefs) {
              if (!streamIdByName.has(def.streamName)) {
                const stream = await setupRequest(() => createStream.mutateAsync({ name: def.streamName }));
                streamIdByName.set(def.streamName, stream.id);
              }
              if (def.groupName) {
                const groupName = def.groupName;
                const group = await setupRequest(() => createStreamGroup.mutateAsync({
                  streamId: streamIdByName.get(def.streamName)!,
                  data: { name: groupName },
                }));
                groupIdByKey.set(def.key, group.id);
              }
            }

            for (const grade of alGrades) {
              const gradeNumber = gradeNumberOf(grade);
              const gradeStreams = alStreams[gradeNumber] ?? {};
              for (const def of enabledDefs) {
                const config = gradeStreams[def.key];
                if (!config?.enabled) continue;
                const code = config.code.trim() || def.defaultCode;
                for (let i = 0; i < config.sections; i++) {
                  await setupRequest(() => createClass.mutateAsync({
                    grade_id: grade.id,
                    academic_year_id: year.id,
                    stream_id: streamIdByName.get(def.streamName)!,
                    stream_group_id: def.groupName ? groupIdByKey.get(def.key) ?? null : null,
                    name: `${gradeNumber}-${code}${i + 1}`,
                    medium_id: (selectedMediumNames[0] && mediumIdByName.get(selectedMediumNames[0])) || null,
                    capacity: classCapacity,
                  }));
                }
              }
            }
          }
        }
        progress.classes = true;
      }

      if (!progress.rooms) {
        if (!skipRooms) {
          const namedRooms = facilityRooms.filter((room) => room.name.trim());
          for (const room of namedRooms) {
            await setupRequest(() => createClassroom.mutateAsync({
              name: room.name.trim(),
              // Keep the setup category with the room so Resources can show
              // libraries, IT labs, halls, and other facilities distinctly.
              code: room.group,
              room_type: "eca",
              capacity: room.capacity === "" ? undefined : room.capacity,
            }));
          }
        }
        progress.rooms = true;
      }

      setSubmitted(true);
    } catch (e) {
      setSubmitError(getErrorMessage(e, "Failed to save your school setup. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, submitError, submitted, submitAll };
}
