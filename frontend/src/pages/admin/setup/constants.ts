export type ALStreamKey = "science_physical" | "science_bio" | "commerce" | "arts" | "technology";

export interface ALStreamDef {
  key: ALStreamKey;
  label: string;
  streamName: string;
  groupName: string | null;
  defaultCode: string;
}

export type AlStreamsState = Record<ALStreamKey, { enabled: boolean; code: string; sections: number }>;

export interface SchoolFormState {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  school_type: "boys" | "girls" | "mixed";
  grade_from: number | "";
  grade_to: number | "";
}

export const AL_STREAM_DEFS: ALStreamDef[] = [
  { key: "science_physical", label: "Physical Science", streamName: "Science", groupName: "Physical Science", defaultCode: "M" },
  { key: "science_bio", label: "Bio Science", streamName: "Science", groupName: "Bio Science", defaultCode: "B" },
  { key: "commerce", label: "Commerce", streamName: "Commerce", groupName: null, defaultCode: "C" },
  { key: "arts", label: "Arts", streamName: "Arts", groupName: null, defaultCode: "A" },
  { key: "technology", label: "Technology", streamName: "Technology", groupName: null, defaultCode: "T" },
];

export const AL_GRADE_NUMBERS = new Set([12, 13]);

export const ACCENT = "#406AAF";
export const GRADE_MIN = 1;
export const GRADE_MAX = 13;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mediums precede Classes so the Classes step can tag each section with a
// language of instruction as it is generated.
export const STEPS = ["School", "Houses", "Grades", "Mediums", "Classes", "Done"] as const;
export const HOUSE_COLOR_PALETTE = ["#0f62fe", "#da1e28", "#24a148", "#f1c21b", "#8a3ffc", "#ff832b"];
export const SUGGESTED_MEDIUMS = ["Sinhala", "Tamil", "English"];
