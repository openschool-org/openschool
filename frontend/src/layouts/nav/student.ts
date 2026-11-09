import { BellOutlined, BulbOutlined, FileDoneOutlined, FileTextOutlined, HomeOutlined, ScheduleOutlined, TableOutlined, TeamOutlined } from "@ant-design/icons";
import type { NavGroup } from "@/layouts/nav/types";

export const STUDENT_NAV: NavGroup[] = [
  { label: "Overview", labelKey: "nav.group.overview", items: [{ path: "/", label: "Dashboard", labelKey: "nav.dashboard", Icon: HomeOutlined }] },
  {
    label: "Academics",
    labelKey: "nav.group.academics",
    items: [
      { path: "/s/attendance", label: "Attendance", labelKey: "nav.attendance", Icon: ScheduleOutlined },
      { path: "/s/marks", label: "Marks", labelKey: "nav.marks", Icon: FileDoneOutlined },
      { path: "/s/timetable", label: "Timetable", labelKey: "nav.timetable", Icon: TableOutlined },
      { path: "/s/enrollment", label: "Subject Enrolment", labelKey: "nav.subjectEnrolment", Icon: FileTextOutlined },
    ],
  },
  {
    label: "Portfolio",
    labelKey: "nav.group.portfolio",
    items: [
      { path: "/s/progress", label: "Progress Reports", labelKey: "nav.progressReports", Icon: FileDoneOutlined },
      { path: "/s/portfolio", label: "Activities & Leadership", labelKey: "nav.activities", Icon: BulbOutlined },
      { path: "/s/guardians", label: "My Guardians", labelKey: "nav.myGuardians", Icon: TeamOutlined },
    ],
  },
  {
    label: "System",
    labelKey: "nav.group.system",
    items: [{ path: "/notification-center", label: "Notifications", labelKey: "nav.notifications", Icon: BellOutlined }],
  },
];
