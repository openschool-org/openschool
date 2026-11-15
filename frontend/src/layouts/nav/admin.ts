import { BankOutlined, BellOutlined, BookOutlined, BulbOutlined, CalendarOutlined, CarryOutOutlined, ClusterOutlined, CrownOutlined, FilePdfOutlined, GlobalOutlined, HomeOutlined, LineChartOutlined, ReadOutlined, ReloadOutlined, ScheduleOutlined, SettingOutlined, SolutionOutlined, TableOutlined, TeamOutlined, TrophyOutlined, UserAddOutlined } from "@ant-design/icons";
import type { NavGroup } from "@/layouts/nav/types";

// Sections group related pages; one-page groups render as plain links (see SidebarNav).
export const ADMIN_NAV: NavGroup[] = [
  { label: "Overview", items: [{ path: "/", label: "Overview", Icon: HomeOutlined }] },
  {
    label: "People",
    Icon: TeamOutlined,
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
    Icon: BookOutlined,
    items: [
      { path: "/academic-years", label: "Academic Years", Icon: CalendarOutlined },
      { path: "/classes", label: "Grades & Classes", Icon: BankOutlined },
      { path: "/streams", label: "Streams", Icon: UserAddOutlined },
      { path: "/subjects", label: "Curriculum", Icon: BookOutlined },
      { path: "/mediums", label: "Mediums", Icon: GlobalOutlined },
      { path: "/teacher-subjects", label: "Teacher Subjects", Icon: ReadOutlined },
    ],
  },
  {
    label: "Scheduling",
    Icon: TableOutlined,
    items: [
      { path: "/timetables", label: "Timetable", Icon: TableOutlined },
      { path: "/resources", label: "Resources", Icon: BankOutlined },
    ],
  },
  {
    label: "Attendance",
    Icon: ScheduleOutlined,
    items: [
      { path: "/attendance", label: "Student Attendance", Icon: ScheduleOutlined },
      { path: "/staff-attendance", label: "Staff Attendance", Icon: ClusterOutlined },
      { path: "/teacher-leave", label: "Teacher Leave", Icon: CarryOutOutlined },
    ],
  },
  {
    label: "Reports",
    Icon: LineChartOutlined,
    items: [
      { path: "/reports", label: "Reports", Icon: FilePdfOutlined },
      { path: "/analytics", label: "Analytics", Icon: LineChartOutlined },
    ],
  },
  { label: "Notifications", items: [{ path: "/notifications", label: "Notifications", Icon: BellOutlined }] },
  { label: "Year-end", items: [{ path: "/year-end", label: "Year-end", Icon: ReloadOutlined }] },
  { label: "Settings", items: [{ path: "/settings", label: "Settings", Icon: SettingOutlined }] },
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
