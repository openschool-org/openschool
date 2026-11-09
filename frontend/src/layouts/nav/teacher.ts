import { AuditOutlined, BankOutlined, BellOutlined, BulbOutlined, CalendarOutlined, CarryOutOutlined, FileDoneOutlined, HomeOutlined, LineChartOutlined, ReloadOutlined, ScheduleOutlined, SettingOutlined, TableOutlined } from "@ant-design/icons";
import type { NavGroup } from "@/layouts/nav/types";

// Only a Section Head can act on the review queue, so others do not get the item.
function teachingGroups(isSectionHead: boolean): NavGroup[] {
  return [
    {
      label: "Academics",
      items: [
        { path: "/t/classes", label: "My Classes", Icon: BankOutlined },
        { path: "/t/timetable", label: "My Timetable", Icon: TableOutlined, exact: true },
        { path: "/t/marks", label: "Record Marks", Icon: FileDoneOutlined },
        ...(isSectionHead ? [{ path: "/t/timetable/review", label: "Review Timetables", Icon: ReloadOutlined, exact: true }] : []),
        { path: "/t/my-society", label: "My Society", Icon: BulbOutlined, exact: true },
      ],
    },
    {
      label: "Operations",
      items: [
        { path: "/t/attendance", label: "Class Attendance", Icon: ScheduleOutlined },
        { path: "/t/my-attendance", label: "My Attendance", Icon: CalendarOutlined, exact: true },
        { path: "/t/leave", label: "My Leave", Icon: CarryOutOutlined, exact: true },
      ],
    },
  ];
}

// Principal and Vice Principal monitor the whole school instead of teaching (ADR 0002).
const LEADERSHIP_GROUPS: NavGroup[] = [
  {
    label: "School",
    items: [
      { path: "/t/analytics", label: "Analytics", Icon: LineChartOutlined, exact: true },
      { path: "/t/all-timetables", label: "All Timetables", Icon: TableOutlined, exact: true },
      { path: "/t/leave-approvals", label: "Teacher Leave", Icon: AuditOutlined, exact: true },
      { path: "/t/leave", label: "My Leave", Icon: CarryOutOutlined, exact: true },
    ],
  },
];

const SYSTEM_GROUP: NavGroup = {
  label: "System",
  items: [
    { path: "/t/notifications", label: "Notifications", Icon: BellOutlined, exact: true },
    { path: "/t/profile", label: "My Profile", Icon: SettingOutlined },
  ],
};

export function teacherNav(opts: { isLeadership: boolean; isSectionHead: boolean }): NavGroup[] {
  return [
    { label: "Overview", items: [{ path: "/", label: "Overview", Icon: HomeOutlined }] },
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
