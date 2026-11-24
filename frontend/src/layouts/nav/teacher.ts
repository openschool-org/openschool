import { AuditOutlined, BankOutlined, BellOutlined, BulbOutlined, CalendarOutlined, ReadOutlined, CarryOutOutlined, FileDoneOutlined, HomeOutlined, LineChartOutlined, ReloadOutlined, ScheduleOutlined, SendOutlined, SettingOutlined, TableOutlined, UserOutlined } from "@ant-design/icons";
import type { NavGroup } from "@/layouts/nav/types";

// Only a Section Head can act on the review queue, so others do not get the item.
function teachingGroups(isSectionHead: boolean, isClassTeacher: boolean): NavGroup[] {
  return [
    {
      label: "Academics",
      Icon: ReadOutlined,
      items: [
        // Only a class teacher has a class of their own.
        ...(isClassTeacher ? [{ path: "/t/classes", label: "My classes", Icon: BankOutlined }] : []),
        { path: "/t/timetable", label: "My timetable", Icon: TableOutlined, exact: true },
        { path: "/t/marks", label: "Marks", Icon: FileDoneOutlined },
        ...(isSectionHead ? [{ path: "/t/timetable/review", label: "Review timetables", Icon: ReloadOutlined, exact: true }] : []),
        { path: "/t/my-society", label: "My society", Icon: BulbOutlined, exact: true },
      ],
    },
    {
      label: "Attendance & leave",
      Icon: ScheduleOutlined,
      items: [
        { path: "/t/attendance", label: "Class attendance", Icon: ScheduleOutlined },
        ...(isSectionHead ? [{ path: "/t/section-attendance", label: "Section attendance", Icon: AuditOutlined, exact: true }] : []),
        { path: "/t/my-attendance", label: "My attendance", Icon: CalendarOutlined, exact: true },
        { path: "/t/leave", label: "My leave", Icon: CarryOutOutlined, exact: true },
      ],
    },
  ];
}

// Principal and Vice Principal monitor the whole school instead of teaching (ADR 0002).
const LEADERSHIP_GROUPS: NavGroup[] = [
  {
    label: "School",
    Icon: BankOutlined,
    items: [
      { path: "/t/analytics", label: "Analytics", Icon: LineChartOutlined, exact: true },
      { path: "/t/all-timetables", label: "All timetables", Icon: TableOutlined, exact: true },
      { path: "/t/leave-approvals", label: "Teacher leave", Icon: AuditOutlined, exact: true },
      { path: "/t/leave", label: "My leave", Icon: CarryOutOutlined, exact: true },
    ],
  },
];

// Sending notices is everyday teaching work, so it sits with the inbox, not under Account.
const COMMUNICATION_GROUP: NavGroup = {
  label: "Communication",
  Icon: BellOutlined,
  items: [
    { path: "/notification-center", label: "Notifications", Icon: BellOutlined, exact: true },
    { path: "/t/notifications", label: "Send notifications", Icon: SendOutlined, exact: true },
  ],
};

const SYSTEM_GROUP: NavGroup = {
  label: "Account",
  Icon: SettingOutlined,
  items: [{ path: "/t/profile", label: "My profile", Icon: UserOutlined }],
};

export function teacherNav(opts: { isLeadership: boolean; isSectionHead: boolean; isClassTeacher: boolean }): NavGroup[] {
  return [
    { label: "Overview", items: [{ path: "/", label: "Dashboard", Icon: HomeOutlined }] },
    ...(opts.isLeadership ? LEADERSHIP_GROUPS : teachingGroups(opts.isSectionHead, opts.isClassTeacher)),
    COMMUNICATION_GROUP,
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
