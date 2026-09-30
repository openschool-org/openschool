import { Book, Building, Chat, Chemistry, HospitalBed, Laptop, Microscope, PaintBrush, Restaurant, Theater, Tools, Translate, UserMultiple } from "@carbon/icons-react";
import type { Classroom } from "@/features/timetable/api/classroom";
import { DanceRoomIcon, HallIcon, MusicRoomIcon } from "@/features/timetable/components/facilityIcons";
import { gradeBand } from "@/shared/lib/gradeBand";

export type Band = "primary" | "junior" | "ol" | "al" | "none";

// Facilities share the grade palette by kind: teal shared spaces, purple labs, magenta arts, blue support.
const FACILITIES: Record<string, { Icon: React.ComponentType<{ size?: number }>; band: Band }> = {
  library: { Icon: Book, band: "primary" },
  auditorium: { Icon: HallIcon, band: "primary" },
  scienceLab: { Icon: Chemistry, band: "ol" },
  itLab: { Icon: Laptop, band: "ol" },
  technicalLab: { Icon: Tools, band: "ol" },
  homeEconomicsLab: { Icon: Restaurant, band: "ol" },
  languageLab: { Icon: Translate, band: "ol" },
  artRoom: { Icon: PaintBrush, band: "al" },
  musicRoom: { Icon: MusicRoomIcon, band: "al" },
  danceRoom: { Icon: DanceRoomIcon, band: "al" },
  dramaRoom: { Icon: Theater, band: "al" },
  medicalRoom: { Icon: HospitalBed, band: "junior" },
  counselingRoom: { Icon: Chat, band: "junior" },
  staffRoom: { Icon: UserMultiple, band: "junior" },
};

// "Grade 10" for homeroom 10-A, or null when the name has no grade number.
export function homeroomGrade(room: Classroom): string | null {
  const grade = room.name.match(/^\d+/)?.[0];
  return grade ? `Grade ${grade}` : null;
}

// The icon and colour band for a facility; homerooms use their grade's band.
export function roomKind(room: Classroom): { Icon: React.ComponentType<{ size?: number }>; band: Band } {
  if (room.room_type === "regular") return { Icon: Building, band: gradeBand(homeroomGrade(room)) as Band };
  return (room.code && FACILITIES[room.code]) || { Icon: room.room_type === "lab" ? Microscope : Building, band: room.room_type === "lab" ? "ol" : "none" };
}

// Carbon tag colours that match each band, so a room's tag agrees with its avatar.
export const BAND_TAG = { primary: "teal", junior: "blue", ol: "purple", al: "magenta", none: "gray" } as const;
