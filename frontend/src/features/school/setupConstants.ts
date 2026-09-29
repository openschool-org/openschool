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

export const GRADE_MIN = 1;
export const GRADE_MAX = 13;
// Mediums come before Classes so generated sections can be tagged with a medium; Rooms is independent and goes last.
export const STEPS = ["School", "Houses", "Grades", "Mediums", "Classes", "Rooms", "Done"] as const;
export const HOUSE_COLOR_PALETTE = ["#0f62fe", "#da1e28", "#24a148", "#f1c21b", "#8a3ffc", "#ff832b"];
export const SUGGESTED_MEDIUMS = ["Sinhala", "Tamil", "English"];
export const DEFAULT_CLASS_CAPACITY = 45;

// Special rooms created as "eca" during setup; an admin can retag them as subject Labs later.
export type FacilityGroupKey =
  | "library"
  | "scienceLab"
  | "itLab"
  | "technicalLab"
  | "homeEconomicsLab"
  | "languageLab"
  | "artRoom"
  | "musicRoom"
  | "danceRoom"
  | "dramaRoom"
  | "auditorium"
  | "medicalRoom"
  | "counselingRoom"
  | "staffRoom";

export interface FacilityRoom {
  id: string;
  group: FacilityGroupKey;
  name: string;
  capacity: number | "";
}

// Each group can contain any number of separately named facilities.
export const FACILITY_GROUPS: ReadonlyArray<{ key: FacilityGroupKey; label: string; addLabel: string; placeholder: string; help: string }> = [
  { key: "library", label: "Libraries", addLabel: "Add library", placeholder: "e.g. Main Library", help: "Add multiple libraries with their own names." },
  { key: "scienceLab", label: "Science labs", addLabel: "Add science lab", placeholder: "e.g. Chemistry Lab", help: "Add labs such as Physics, Chemistry, or Biology." },
  { key: "itLab", label: "IT labs", addLabel: "Add IT lab", placeholder: "e.g. Computer Lab 1", help: "Add multiple computer or technology labs." },
  { key: "technicalLab", label: "Technical labs", addLabel: "Add technical lab", placeholder: "e.g. Technical Studies Lab", help: "For practical technology, engineering, or vocational work." },
  { key: "homeEconomicsLab", label: "Home economics labs", addLabel: "Add home economics lab", placeholder: "e.g. Home Economics Room", help: "For cooking, sewing, and domestic science practicals." },
  { key: "languageLab", label: "Language labs", addLabel: "Add language lab", placeholder: "e.g. English Language Lab", help: "For Sinhala, Tamil, English, and other language practice." },
  { key: "artRoom", label: "Art rooms", addLabel: "Add art room", placeholder: "e.g. Visual Arts Room", help: "For art, craft, and aesthetic studies." },
  { key: "musicRoom", label: "Music rooms", addLabel: "Add music room", placeholder: "e.g. Primary Music Room", help: "Add separate rooms for different music programmes." },
  { key: "danceRoom", label: "Dancing rooms", addLabel: "Add dancing room", placeholder: "e.g. Kandyan Dancing Room", help: "For dancing, movement, and traditional dance practice." },
  { key: "dramaRoom", label: "Drama rooms", addLabel: "Add drama room", placeholder: "e.g. Drama Practice Room", help: "For drama, theatre, and performance rehearsals." },
  { key: "auditorium", label: "Auditoriums and halls", addLabel: "Add auditorium", placeholder: "e.g. Main Hall", help: "For assemblies, ceremonies, performances, and examinations." },
  { key: "medicalRoom", label: "Medical / sick rooms", addLabel: "Add medical room", placeholder: "e.g. School Sick Room", help: "For first aid and student health support." },
  { key: "counselingRoom", label: "Counseling rooms", addLabel: "Add counseling room", placeholder: "e.g. Student Counseling Room", help: "For student counseling and welfare services." },
  { key: "staffRoom", label: "Staff rooms", addLabel: "Add staff room", placeholder: "e.g. Teachers’ Staff Room", help: "Add separate staff rooms when departments use different spaces." },
];
