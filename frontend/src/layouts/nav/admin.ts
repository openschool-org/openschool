import {
  Home, ChartLine, UserMultiple, Education, Building, Book, Language, EventSchedule, Settings, Calendar,
  Notification, UserFollow, UserAdmin, UserRole, Trophy, Renew, Table, Group, DocumentPdf, Idea,
} from "@carbon/icons-react";
import type { NavGroup } from "@/layouts/nav/types";

export const ADMIN_NAV: NavGroup[] = [
  { label: "Overview", items: [{ path: "/", label: "Overview", Icon: Home }] },
  {
    label: "People",
    items: [
      { path: "/positions", label: "Principal and VPs", Icon: UserRole },
      { path: "/teachers", label: "Teachers", Icon: Education },
      { path: "/non-academic-staff", label: "Staff", Icon: Group },
      { path: "/students", label: "Students", Icon: UserMultiple },
      { path: "/guardians", label: "Guardians", Icon: UserAdmin },
      { path: "/prefects", label: "School Prefects", Icon: Trophy },
      { path: "/societies", label: "Societies", Icon: Idea },
    ],
  },
  {
    label: "Academics",
    items: [
      { path: "/academic-years", label: "Academic Years", Icon: Calendar },
      { path: "/classes", label: "Grades & Classes", Icon: Building },
      { path: "/streams", label: "Streams", Icon: UserFollow },
      { path: "/subjects", label: "Subjects & Curriculum", Icon: Book },
      { path: "/mediums", label: "Languages of instruction", Icon: Language },
      { path: "/teacher-subjects", label: "Teacher Subjects", Icon: Education },
    ],
  },
  {
    label: "Timetable",
    items: [
      { path: "/timetables", label: "Timetable", Icon: Table },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/attendance", label: "Student Attendance", Icon: EventSchedule },
      { path: "/staff-attendance", label: "Staff Attendance", Icon: Group },
      { path: "/year-end", label: "Year-end", Icon: Renew },
      { path: "/notifications", label: "Notifications", Icon: Notification },
      { path: "/reports", label: "Reports", Icon: DocumentPdf },
      { path: "/analytics", label: "Analytics", Icon: ChartLine },
      { path: "/settings", label: "Settings", Icon: Settings },
    ],
  },
];

// Hub tabs and legacy routes that belong to a nav page.
export const ADMIN_ALIASES: Record<string, string> = {
  "/promotion": "/year-end",
  "/timetables/generate": "/timetables",
  "/classrooms": "/timetables",
  "/subject-requirements": "/timetables",
  "/timetable-settings": "/timetables",
  "/grade-sections": "/timetables",
  "/curriculum": "/subjects",
};
