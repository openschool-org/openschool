import type { Grade } from "@/features/academics/api/grade";
import type { HouseRow } from "@/features/school/components/setup/HousesStep";
import { SUGGESTED_MEDIUMS, type ALStreamKey, type AlStreamsByGradeState, type FacilityRoom, type SchoolFormState } from "@/features/school/setupConstants";
import type { SetupRequest } from "@/features/school/lib/setupRequest";
import type { useCreateSchool } from "@/features/school/queries/useSchool";
import type { useCreateHouse } from "@/features/school/queries/useHouses";
import type { useCreateGrade } from "@/features/academics/queries/useGrades";
import type { useCreateAcademicYear } from "@/features/school/queries/useAcademicYears";
import type { useCreateClass, useCreateStream, useCreateStreamGroup } from "@/features/academics/queries/useClasses";
import type { useCreateMedium } from "@/features/curriculum/queries/useCurriculum";
import type { useCreateClassroom } from "@/features/timetable/queries/useClassrooms";

// Tracks which submission phases already succeeded, so Retry after a mid-sequence failure resumes instead of duplicating them.
export interface SubmitProgress {
  school: boolean;
  // Names of houses already created, skipped on retry.
  houses: Set<string>;
  grades: Grade[] | null;
  // Created medium ids keyed by name, reused on retry instead of recreated.
  mediums: Map<string, string> | null;
  academicYearId: string | null;
  streams: Map<string, string>;
  groups: Map<ALStreamKey, string>;
  // Keys ("gradeId:className") of classes already created, skipped on retry.
  classes: Set<string>;
  classesDone: boolean;
  // Keys ("group:name") of rooms already created, skipped on retry.
  rooms: Set<string>;
}

export const newSubmitProgress = (): SubmitProgress => ({
  school: false,
  houses: new Set(),
  grades: null,
  mediums: null,
  academicYearId: null,
  streams: new Map(),
  groups: new Map(),
  classes: new Set(),
  classesDone: false,
  rooms: new Set(),
});

export interface SetupInput {
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

type Mutate<H extends () => { mutateAsync: unknown }> = ReturnType<H>["mutateAsync"];

// The mutateAsync functions the setup calls, one per entity.
export interface SetupApi {
  createSchool: Mutate<typeof useCreateSchool>;
  createHouse: Mutate<typeof useCreateHouse>;
  createGrade: Mutate<typeof useCreateGrade>;
  createMedium: Mutate<typeof useCreateMedium>;
  createAcademicYear: Mutate<typeof useCreateAcademicYear>;
  createClass: Mutate<typeof useCreateClass>;
  createStream: Mutate<typeof useCreateStream>;
  createStreamGroup: Mutate<typeof useCreateStreamGroup>;
  createClassroom: Mutate<typeof useCreateClassroom>;
}

export type ClassData = Parameters<SetupApi["createClass"]>[0];

export interface SetupContext {
  api: SetupApi;
  request: SetupRequest;
  progress: SubmitProgress;
}

const gradeOrNull = (value: number | "") => (value === "" ? null : Number(value));

export async function createSchoolStep({ api, request, progress }: SetupContext, school: SchoolFormState) {
  if (progress.school) return;
  await request(() => api.createSchool({
    name: school.name.trim(),
    address: school.address.trim(),
    phone: school.phone.trim(),
    email: school.email.trim(),
    logo_url: school.logo_url || undefined,
    school_type: school.school_type,
    grade_from: gradeOrNull(school.grade_from),
    grade_to: gradeOrNull(school.grade_to),
  }));
  progress.school = true;
}

export async function createHousesStep({ api, request, progress }: SetupContext, houses: HouseRow[]) {
  for (const house of houses.filter((h) => h.name.trim())) {
    const name = house.name.trim();
    if (progress.houses.has(name)) continue;
    await request(() => api.createHouse({ name, code: house.code.trim() || undefined, color: house.color }));
    progress.houses.add(name);
  }
}

// A/L runs over two years, so picking either of 12 or 13 adds both when the school's range covers them.
export function setupGradeNumbers(school: SchoolFormState, selected: number[]) {
  const numbers = new Set(selected);
  const covers = (n: number) => school.grade_from !== "" && school.grade_to !== "" && Number(school.grade_from) <= n && Number(school.grade_to) >= n;
  if ((numbers.has(12) || numbers.has(13)) && covers(12) && covers(13)) {
    numbers.add(12);
    numbers.add(13);
  }
  return [...numbers].sort((a, b) => a - b);
}

export async function createGradesStep({ api, request, progress }: SetupContext, gradeNumbers: number[]) {
  if (!progress.grades) {
    const created: Grade[] = [];
    for (let i = 0; i < gradeNumbers.length; i++) {
      created.push(await request(() => api.createGrade({ name: `Grade ${gradeNumbers[i]}`, sort_order: i })));
    }
    progress.grades = created;
  }
  return progress.grades;
}

export async function createMediumsStep({ api, request, progress }: SetupContext, input: SetupInput) {
  if (!progress.mediums) {
    const byName = new Map<string, string>();
    if (!input.mediumsSkipped) {
      const names = [...SUGGESTED_MEDIUMS.filter((m) => input.mediumChecks[m]), ...input.customMediums.filter((m) => m.trim())];
      for (const name of names) {
        const medium = await request(() => api.createMedium({ name }));
        byName.set(name, medium.id);
      }
    }
    progress.mediums = byName;
  }
  return progress.mediums;
}

export async function createRoomsStep({ api, request, progress }: SetupContext, rooms: FacilityRoom[]) {
  for (const room of rooms.filter((r) => r.name.trim())) {
    const key = `${room.group}:${room.name.trim()}`;
    if (progress.rooms.has(key)) continue;
    await request(() => api.createClassroom({
      name: room.name.trim(),
      // Keep the setup category with the room so Resources can show libraries, IT labs, halls and other facilities distinctly.
      code: room.group,
      room_type: "eca",
      capacity: room.capacity === "" ? undefined : room.capacity,
    }));
    progress.rooms.add(key);
  }
}
