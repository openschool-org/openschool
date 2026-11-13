import type { Classroom } from "@/features/timetable/api/classroom";
import { gradeBand } from "@/shared/lib/gradeBand";

export type Band = "primary" | "junior" | "ol" | "al" | "none";

// Facilities share the grade palette by kind: shared spaces, labs, arts and support each get one band.
const FACILITY_BAND: Record<string, Band> = {
  library: "primary",
  auditorium: "primary",
  scienceLab: "ol",
  itLab: "ol",
  technicalLab: "ol",
  homeEconomicsLab: "ol",
  languageLab: "ol",
  artRoom: "al",
  musicRoom: "al",
  danceRoom: "al",
  dramaRoom: "al",
  medicalRoom: "junior",
  counselingRoom: "junior",
  staffRoom: "junior",
};

// "Grade 10" for homeroom 10-A, or null when the name has no grade number.
export function homeroomGrade(room: Classroom): string | null {
  const grade = room.name.match(/^\d+/)?.[0];
  return grade ? `Grade ${grade}` : null;
}

// The colour band for a room: homerooms use their grade's band, facilities their kind's.
export function roomBand(room: Classroom): Band {
  if (room.room_type === "regular") return gradeBand(homeroomGrade(room)) as Band;
  return (room.code && FACILITY_BAND[room.code]) || (room.room_type === "lab" ? "ol" : "none");
}

// antd Tag colour per band, so a room's type tag matches its section; undefined is the neutral tag.
export const BAND_COLOR: Record<Band, string | undefined> = { primary: "cyan", junior: "blue", ol: "purple", al: "magenta", none: undefined };
