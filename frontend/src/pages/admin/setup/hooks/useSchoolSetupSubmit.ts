import { useRef, useState } from "react";
import { useCreateSchool } from "../../../../queries/useSchool";
import { useCreateHouse } from "../../../../queries/useHouses";
import { useCreateGrade } from "../../../../queries/useGrades";
import { useCreateAcademicYear } from "../../../../queries/useAcademicYears";
import { useCreateClass, useCreateStream, useCreateStreamGroup } from "../../../../queries/useClasses";
import { useCreateMedium } from "../../../../queries/useCurriculum";
import { useCreateClassroom } from "../../../../queries/timetable/useClassrooms";
import { getErrorMessage } from "../../../../lib/errorMessage";
import type { Grade } from "../../../../services/grade";
import { AL_STREAM_DEFS, AL_GRADE_NUMBERS, SUGGESTED_MEDIUMS, SUGGESTED_ROOMS, type ALStreamKey, type AlStreamsState, type SchoolFormState } from "../constants";
import type { HouseRow } from "../components/HousesStep";

// Tracks which phases of the final submission have already succeeded, so
// clicking Retry after a mid-sequence failure resumes instead of
// re-creating (and duplicating) whatever already went through.
interface SubmitProgress {
  school: boolean;
  houses: boolean;
  grades: Grade[] | null;
  // created medium ids keyed by name, so a retry after a partial failure
  // reuses them instead of creating duplicates
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
  yearLabel: string;
  sectionsPerGrade: Record<number, number>;
  sectionMediums: Record<string, string>;
  alStreams: AlStreamsState;
  classesSkipped: boolean;
  roomsSkipped: boolean;
  roomChecks: Record<string, boolean>;
  customRooms: string[];
}

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
  const progressRef = useRef<SubmitProgress>({
    school: false,
    houses: false,
    grades: null,
    mediums: null,
    classes: false,
    rooms: false,
  });

  // skipRoomsOverride is passed by the Rooms step, whose setState hasn't
  // applied yet when it kicks off the submit — reading roomsSkipped state
  // here would see the previous value and create rooms the admin chose to
  // skip.
  const submitAll = async (skipRoomsOverride?: boolean) => {
    const {
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
      roomsSkipped,
      roomChecks,
      customRooms,
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

      // Mediums are written before classes so each generated section can be
      // tagged with its language of instruction in the same pass.
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
          const regularGrades = createdGrades.filter((g) => !AL_GRADE_NUMBERS.has(Number(g.name.replace(/\D/g, ""))));
          const alGrades = createdGrades.filter((g) => AL_GRADE_NUMBERS.has(Number(g.name.replace(/\D/g, ""))));

          // Derived from the label the admin actually typed (e.g. "2025"),
          // not the real-world current year — those two can differ when
          // setting the system up for a past or upcoming academic year.
          // Falls back to the current year only if the label has no
          // 4-digit year in it (e.g. a fully custom label).
          const labelYear = Number(yearLabel.trim().match(/\d{4}/)?.[0] ?? now.getFullYear());
          const year = await createAcademicYear.mutateAsync({
            label: yearLabel.trim(),
            // Built at UTC midnight directly (Date.UTC), not via the local-
            // timezone Date constructor — for any timezone ahead of UTC
            // (Sri Lanka included, UTC+5:30), `new Date(y, 0, 1).toISOString()`
            // shifts to December 31 of the previous year once converted to UTC.
            start_date: new Date(Date.UTC(labelYear, 0, 1)).toISOString(),
            end_date: new Date(Date.UTC(labelYear, 11, 31)).toISOString(),
            is_current: true,
          });

          for (const grade of regularGrades) {
            const gradeNumber = Number(grade.name.replace(/\D/g, ""));
            const count = sectionsPerGrade[gradeNumber] ?? 1;
            for (let i = 0; i < count; i++) {
              const section = String.fromCharCode(65 + i);
              const mediumName = sectionMediums[`${gradeNumber}-${i}`];
              await createClass.mutateAsync({
                grade_id: grade.id,
                academic_year_id: year.id,
                name: `${gradeNumber}-${section}`,
                medium_id: (mediumName && mediumIdByName.get(mediumName)) || null,
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

      if (!progress.rooms) {
        if (!skipRooms) {
          const names = [
            ...SUGGESTED_ROOMS.filter((r) => roomChecks[r]),
            ...customRooms.map((r) => r.trim()).filter(Boolean),
          ];
          for (const name of names) {
            await createClassroom.mutateAsync({ name, room_type: "eca" });
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
