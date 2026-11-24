import { BellOutlined, BulbOutlined, FileDoneOutlined, FileTextOutlined, HomeOutlined, ReadOutlined, ScheduleOutlined, TableOutlined, TeamOutlined, TrophyOutlined, UserOutlined } from "@ant-design/icons";
import type { NavGroup } from "@/layouts/nav/types";

export const STUDENT_NAV: NavGroup[] = [
  { label: "Overview", labelKey: "nav.group.overview", items: [{ path: "/", label: "Dashboard", labelKey: "nav.dashboard", Icon: HomeOutlined }] },
  {
    label: "Academics",
    labelKey: "nav.group.academics",
    Icon: ReadOutlined,
    items: [
      { path: "/s/attendance", label: "Attendance", labelKey: "nav.attendance", Icon: ScheduleOutlined },
      { path: "/s/marks", label: "Results", labelKey: "nav.marks", Icon: FileDoneOutlined },
      { path: "/s/timetable", label: "Timetable", labelKey: "nav.timetable", Icon: TableOutlined },
      { path: "/s/enrollment", label: "Subject enrolment", labelKey: "nav.subjectEnrolment", Icon: FileTextOutlined },
    ],
  },
  {
    label: "Portfolio",
    labelKey: "nav.group.portfolio",
    Icon: TrophyOutlined,
    items: [
      { path: "/s/progress", label: "Progress reports", labelKey: "nav.progressReports", Icon: FileDoneOutlined },
      { path: "/s/portfolio", label: "Portfolio", labelKey: "nav.activities", Icon: BulbOutlined },
      { path: "/s/guardians", label: "My guardians", labelKey: "nav.myGuardians", Icon: TeamOutlined },
    ],
  },
  {
    label: "Account",
    labelKey: "nav.group.account",
    Icon: UserOutlined,
    items: [
      { path: "/notification-center", label: "Notifications", labelKey: "nav.notifications", Icon: BellOutlined },
      { path: "/s/profile", label: "My profile", labelKey: "nav.myProfile", Icon: UserOutlined },
    ],
  },
];
