import type { DayPart, LeavePolicy, LeaveStatus, LeaveType } from "@/features/leave/api/leave";

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "casual", label: "Casual leave" },
  { value: "sick", label: "Medical leave" },
  { value: "short", label: "Short leave" },
  { value: "duty", label: "Duty leave" },
  { value: "maternity", label: "Maternity leave" },
  { value: "no_pay", label: "No-pay leave" },
];

// Help text for the apply form, using the limits set in Settings.
export function leaveTypeHelp(type: LeaveType, p: LeavePolicy | undefined): string {
  switch (type) {
    case "casual":
      return `${p ? `${p.casual_days_per_year} days a year. ` : ""}Can be taken as a morning or afternoon.`;
    case "sick":
      return `${p ? `${p.sick_days_per_year} days a year. ` : ""}Hand in a medical certificate for more than 2 days.`;
    case "short":
      return p ? `Leave school early or come late: up to ${p.short_leave_max_minutes} minutes, ${p.short_leaves_per_month} times a month.` : "Leave school early or come late.";
    case "duty":
      return "Official work away from school, such as paper marking or a seminar.";
    case "maternity":
      return p ? `${p.maternity_days} working days on full pay for each confinement.` : "Full pay for each confinement.";
    case "no_pay":
      return "Leave without salary once other leave is used up.";
  }
}

export const LEAVE_TYPE_LABELS = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t.label])) as Record<LeaveType, string>;

export const DAY_PARTS: { value: DayPart; label: string }[] = [
  { value: "full", label: "Full day" },
  { value: "morning", label: "Morning (before the interval)" },
  { value: "afternoon", label: "Afternoon (after the interval)" },
];

export const HALF_DAY_TYPES: LeaveType[] = ["casual", "duty"];

// antd Tag colour per status; undefined is the neutral tag.
export const LEAVE_STATUS_TAGS: Record<LeaveStatus, { label: string; color?: string }> = {
  pending: { label: "Waiting for approval", color: "processing" },
  approved: { label: "Approved", color: "success" },
  rejected: { label: "Not approved", color: "error" },
  cancelled: { label: "Cancelled" },
};
