import { Home, Notification, EventSchedule, Report, Table, UserMultiple, Document, Idea } from "@carbon/icons-react";
import type { NavGroup } from "@/layouts/nav/types";

export const STUDENT_NAV: NavGroup[] = [
  { label: "Overview", labelKey: "nav.group.overview", items: [{ path: "/", label: "Dashboard", labelKey: "nav.dashboard", Icon: Home }] },
  {
    label: "Academics",
    labelKey: "nav.group.academics",
    items: [
      { path: "/s/attendance", label: "Attendance", labelKey: "nav.attendance", Icon: EventSchedule },
      { path: "/s/marks", label: "Marks", labelKey: "nav.marks", Icon: Report },
      { path: "/s/timetable", label: "Timetable", labelKey: "nav.timetable", Icon: Table },
      { path: "/s/enrollment", label: "Subject Enrolment", labelKey: "nav.subjectEnrolment", Icon: Document },
    ],
  },
  {
    label: "Portfolio",
    labelKey: "nav.group.portfolio",
    items: [
      { path: "/s/progress", label: "Progress Reports", labelKey: "nav.progressReports", Icon: Report },
      { path: "/s/portfolio", label: "Activities & Leadership", labelKey: "nav.activities", Icon: Idea },
      { path: "/s/guardians", label: "My Guardians", labelKey: "nav.myGuardians", Icon: UserMultiple },
    ],
  },
  {
    label: "System",
    labelKey: "nav.group.system",
    items: [{ path: "/notification-center", label: "Notifications", labelKey: "nav.notifications", Icon: Notification }],
  },
];
