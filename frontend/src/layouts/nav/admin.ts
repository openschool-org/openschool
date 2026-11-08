import { BankOutlined, BellOutlined, BookOutlined, BulbOutlined, CalendarOutlined, CarryOutOutlined, ClusterOutlined, CrownOutlined, FilePdfOutlined, GlobalOutlined, HomeOutlined, LineChartOutlined, ReadOutlined, ReloadOutlined, ScheduleOutlined, SettingOutlined, SolutionOutlined, TableOutlined, TeamOutlined, TrophyOutlined, UserAddOutlined } from "@ant-design/icons";
import type { NavGroup } from "@/layouts/nav/types";

export const ADMIN_NAV: NavGroup[] = [
  { label: "Overview", items: [{ path: "/", label: "Overview", Icon: HomeOutlined }] },
  {
    label: "People",
    items: [
      { path: "/positions", label: "Principal and VPs", Icon: SolutionOutlined },
      { path: "/teachers", label: "Teachers", Icon: ReadOutlined },
      { path: "/non-academic-staff", label: "Staff", Icon: ClusterOutlined },
      { path: "/students", label: "Students", Icon: TeamOutlined },
      { path: "/guardians", label: "Guardians", Icon: CrownOutlined },
      { path: "/prefects", label: "School Prefects", Icon: TrophyOutlined },
      { path: "/societies", label: "Societies", Icon: BulbOutlined },
    ],
  },
  {
    label: "Academics",
    items: [
      { path: "/academic-years", label: "Academic Years", Icon: CalendarOutlined },
      { path: "/classes", label: "Grades & Classes", Icon: BankOutlined },
      { path: "/streams", label: "Streams", Icon: UserAddOutlined },
      { path: "/subjects", label: "Subjects & Curriculum", Icon: BookOutlined },
      { path: "/mediums", label: "Languages of instruction", Icon: GlobalOutlined },
      { path: "/teacher-subjects", label: "Teacher Subjects", Icon: ReadOutlined },
    ],
  },
  {
    label: "School resources",
    items: [
      { path: "/resources", label: "Resources & facilities", Icon: BankOutlined },
    ],
  },
  {
    label: "Timetable",
    items: [{ path: "/timetables", label: "Timetable", Icon: TableOutlined }],
  },
  {
    label: "Operations",
    items: [
      { path: "/attendance", label: "Student Attendance", Icon: ScheduleOutlined },
      { path: "/staff-attendance", label: "Staff Attendance", Icon: ClusterOutlined },
      { path: "/teacher-leave", label: "Teacher Leave", Icon: CarryOutOutlined },
      { path: "/year-end", label: "Year-end", Icon: ReloadOutlined },
      { path: "/notifications", label: "Notifications", Icon: BellOutlined },
      { path: "/reports", label: "Reports", Icon: FilePdfOutlined },
      { path: "/analytics", label: "Analytics", Icon: LineChartOutlined },
      { path: "/settings", label: "Settings", Icon: SettingOutlined },
    ],
  },
];

// Hub tabs and legacy routes that belong to a nav page.
export const ADMIN_ALIASES: Record<string, string> = {
  "/promotion": "/year-end",
  "/timetables/generate": "/timetables",
  "/classrooms": "/resources",
  "/subject-requirements": "/timetables",
  "/timetable-settings": "/timetables",
  "/grade-sections": "/timetables",
  "/curriculum": "/subjects",
};
