import type { Grade } from "@/features/academics/api/grade";
import { AL_GRADE_NUMBERS, AL_STREAM_DEFS, alClassName, regularClassName } from "@/features/school/setupConstants";
import type { ClassData, SetupContext, SetupInput } from "@/features/school/lib/setupSteps";

// Grades here are always named "Grade N" (see createGradesStep), so this recovers N.
const gradeNumberOf = (grade: Grade) => Number(grade.name.replace(/\D/g, ""));

type StreamDef = (typeof AL_STREAM_DEFS)[number];

// Creates the academic year and every class, regular sections first, then A/L stream classes.
export async function createClassesStep(ctx: SetupContext, input: SetupInput, grades: Grade[], mediumIdByName: Map<string, string>) {
  const { progress } = ctx;
  if (progress.classesDone) return;
  if (!input.classesSkipped && input.yearLabel.trim() && grades.length > 0) {
    const yearId = await createYearOnce(ctx, input.yearLabel);
    const createOnce = classCreator(ctx);
    const regular = grades.filter((g) => !AL_GRADE_NUMBERS.has(gradeNumberOf(g)));
    const al = grades.filter((g) => AL_GRADE_NUMBERS.has(gradeNumberOf(g)));
    for (const grade of regular) {
      await createRegularClasses(createOnce, input, grade, yearId, mediumIdByName);
    }
    if (al.length > 0) {
      const enabled = AL_STREAM_DEFS.filter((d) => al.some((grade) => input.alStreams[gradeNumberOf(grade)]?.[d.key]?.enabled));
      await createStreamsOnce(ctx, enabled);
      for (const grade of al) {
        await createAlClasses(ctx, createOnce, input, grade, yearId, enabled, mediumIdByName);
      }
    }
  }
  progress.classesDone = true;
}

async function createYearOnce({ api, request, progress }: SetupContext, yearLabel: string) {
  if (!progress.academicYearId) {
    // Year from the admin's typed label (e.g. "2025"), not today's year, since the setup may target a past or upcoming year.
    const labelYear = Number(yearLabel.trim().match(/\d{4}/)?.[0] ?? new Date().getFullYear());
    const year = await request(() => api.createAcademicYear({
      label: yearLabel.trim(),
      // Date.UTC stops timezones ahead of UTC (e.g. Sri Lanka, UTC+5:30) shifting Jan 1 back to Dec 31.
      start_date: new Date(Date.UTC(labelYear, 0, 1)).toISOString(),
      end_date: new Date(Date.UTC(labelYear, 11, 31)).toISOString(),
      is_current: true,
    }));
    progress.academicYearId = year.id;
  }
  return progress.academicYearId;
}

type CreateOnce = (data: ClassData) => Promise<void>;

// Creates one class unless an earlier attempt already did.
function classCreator({ api, request, progress }: SetupContext): CreateOnce {
  return async (data) => {
    const key = `${data.grade_id}:${data.name}`;
    if (progress.classes.has(key)) return;
    await request(() => api.createClass(data));
    progress.classes.add(key);
  };
}

async function createRegularClasses(createOnce: CreateOnce, input: SetupInput, grade: Grade, yearId: string, mediumIdByName: Map<string, string>) {
  const gradeNumber = gradeNumberOf(grade);
  const count = input.sectionsPerGrade[gradeNumber] ?? 1;
  for (let i = 0; i < count; i++) {
    // An empty string means the admin chose "No medium"; only a section with no choice gets the first medium.
    const mediumName = input.sectionMediums[`${gradeNumber}-${i}`] ?? input.selectedMediumNames[0];
    await createOnce({
      grade_id: grade.id,
      academic_year_id: yearId,
      name: regularClassName(gradeNumber, i),
      medium_id: (mediumName && mediumIdByName.get(mediumName)) || null,
      capacity: input.classCapacity,
    });
  }
}

async function createStreamsOnce({ api, request, progress }: SetupContext, defs: StreamDef[]) {
  for (const def of defs) {
    if (!progress.streams.has(def.streamName)) {
      const stream = await request(() => api.createStream({ name: def.streamName }));
      progress.streams.set(def.streamName, stream.id);
    }
    const groupName = def.groupName;
    if (groupName && !progress.groups.has(def.key)) {
      const group = await request(() => api.createStreamGroup({ streamId: progress.streams.get(def.streamName)!, data: { name: groupName } }));
      progress.groups.set(def.key, group.id);
    }
  }
}

async function createAlClasses(ctx: SetupContext, createOnce: CreateOnce, input: SetupInput, grade: Grade, yearId: string, defs: StreamDef[], mediumIdByName: Map<string, string>) {
  const gradeNumber = gradeNumberOf(grade);
  const gradeStreams = input.alStreams[gradeNumber] ?? {};
  const firstMedium = input.selectedMediumNames[0];
  for (const def of defs) {
    const config = gradeStreams[def.key];
    if (!config?.enabled) continue;
    const code = config.code.trim() || def.defaultCode;
    for (let i = 0; i < config.sections; i++) {
      await createOnce({
        grade_id: grade.id,
        academic_year_id: yearId,
        stream_id: ctx.progress.streams.get(def.streamName)!,
        stream_group_id: def.groupName ? ctx.progress.groups.get(def.key) ?? null : null,
        name: alClassName(gradeNumber, code, i),
        medium_id: (firstMedium && mediumIdByName.get(firstMedium)) || null,
        capacity: input.classCapacity,
      });
    }
  }
}
