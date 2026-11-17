import type { ClassWithDetails } from "@/features/academics/api/class";

export interface SectionHeadSlot {
  key: string;
  gradeId: string;
  gradeName: string;
  streamId: string | null;
  streamName: string | null;
}

// One slot per grade, or per stream in a grade that has streamed classes.
export function sectionHeadRows(classes: ClassWithDetails[], streams: { id: string; name: string }[]): SectionHeadSlot[] {
  const byGrade = new Map<string, { gradeName: string; streamIds: Map<string, string> }>();
  for (const c of classes) {
    if (!byGrade.has(c.grade_id)) byGrade.set(c.grade_id, { gradeName: c.grade_name, streamIds: new Map() });
    if (c.stream_id) byGrade.get(c.grade_id)!.streamIds.set(c.stream_id, streams.find((s) => s.id === c.stream_id)?.name ?? "Stream");
  }
  const rows: SectionHeadSlot[] = [];
  for (const [gradeId, { gradeName, streamIds }] of byGrade) {
    if (streamIds.size === 0) rows.push({ key: gradeId, gradeId, gradeName, streamId: null, streamName: null });
    else for (const [streamId, streamName] of streamIds) rows.push({ key: `${gradeId}-${streamId}`, gradeId, gradeName, streamId, streamName });
  }
  return rows.sort((a, b) => a.gradeName.localeCompare(b.gradeName) || (a.streamName ?? "").localeCompare(b.streamName ?? ""));
}

interface QueryState {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
}

export type SectionHeadsView = "noYear" | "loading" | "headsError" | "structureError" | "empty" | "rows";

// What the panel shows. Stale data is kept on a failed refresh; an error only replaces data that never loaded.
export function sectionHeadsView(hasYear: boolean, heads: QueryState, classes: QueryState, streams: QueryState, rowCount: number): SectionHeadsView {
  if (!hasYear) return "noYear";
  if (heads.isLoading) return "loading";
  if (heads.isError && !heads.hasData) return "headsError";
  if ((classes.isLoading || streams.isLoading) && rowCount === 0) return "loading";
  if ((classes.isError && !classes.hasData) || (streams.isError && !streams.hasData)) return "structureError";
  return rowCount === 0 ? "empty" : "rows";
}
