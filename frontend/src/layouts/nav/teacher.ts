import {
  Home, Building, Table, Renew, Idea, EventSchedule, Calendar, Notification, Settings, Report, ChartLine,
} from "@carbon/icons-react";
import type { NavGroup } from "@/layouts/nav/types";

// Only a Section Head can act on the review queue, so others do not get the item.
function teachingGroups(isSectionHead: boolean): NavGroup[] {
  return [
    {
      label: "Academics",
      items: [
        { path: "/t/classes", label: "My Classes", Icon: Building },
        { path: "/t/timetable", label: "My Timetable", Icon: Table, exact: true },
        { path: "/t/marks", label: "Record Marks", Icon: Report },
        ...(isSectionHead ? [{ path: "/t/timetable/review", label: "Review Timetables", Icon: Renew, exact: true }] : []),
        { path: "/t/my-society", label: "My Society", Icon: Idea, exact: true },
      ],
    },
    {
      label: "Operations",
      items: [
        { path: "/t/attendance", label: "Class Attendance", Icon: EventSchedule },
        { path: "/t/my-attendance", label: "My Attendance", Icon: Calendar, exact: true },
      ],
    },
  ];
}

// Principal and Vice Principal monitor the whole school instead of teaching (ADR 0002).
const LEADERSHIP_GROUPS: NavGroup[] = [
  {
    label: "School",
    items: [
      { path: "/t/analytics", label: "Analytics", Icon: ChartLine, exact: true },
      { path: "/t/all-timetables", label: "All Timetables", Icon: Table, exact: true },
    ],
  },
];

const SYSTEM_GROUP: NavGroup = {
  label: "System",
  items: [
    { path: "/t/notifications", label: "Notifications", Icon: Notification, exact: true },
    { path: "/t/profile", label: "My Profile", Icon: Settings },
  ],
};

export function teacherNav(opts: { isLeadership: boolean; isSectionHead: boolean }): NavGroup[] {
  return [
    { label: "Overview", items: [{ path: "/", label: "Overview", Icon: Home }] },
    ...(opts.isLeadership ? LEADERSHIP_GROUPS : teachingGroups(opts.isSectionHead)),
    SYSTEM_GROUP,
  ];
}

export const TEACHER_ALIASES: Record<string, string> = {
  "/attendance/sessions": "/t/attendance",
  "/timetables": "/t/timetable",
};

export const LEADERSHIP_ALIASES: Record<string, string> = {
  "/timetables": "/t/all-timetables",
};
